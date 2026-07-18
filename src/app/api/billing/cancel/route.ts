import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { cancelSubscription } from '@/lib/billing/subscription';
import { requireMembership } from '@/lib/workspace';
import { BillingError, BillingValidationError, WorkspaceNotBillableError } from '@/lib/billing/errors';
import { validateWorkspaceId } from '@/lib/billing/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/cancel
 * Cancel the workspace subscription. By default, cancels at the end of the
 * current billing period (the user retains access until then). Pass
 * immediately=true to cancel right away.
 *
 * Body:
 *   - immediately?: boolean  (default: false)
 *   - workspaceId?: string   (optional)
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body
  }

  try {
    const workspaceIdParam = validateWorkspaceId(body.workspaceId);
    const immediately = typeof body.immediately === 'boolean' ? body.immediately : false;

    let workspaceId = workspaceIdParam;
    if (!workspaceId) {
      const { db } = await import('@/lib/db');
      const user = await db.user.findUnique({
        where: { id: auth.user!.id },
        select: { activeWorkspaceId: true },
      });
      workspaceId = user?.activeWorkspaceId ?? undefined;
    }
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'NO_ACTIVE_WORKSPACE', message: 'You do not have an active workspace.' },
        { status: 400 },
      );
    }

    const membership = await requireMembership(workspaceId, auth.user!.id);
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new WorkspaceNotBillableError(workspaceId);
    }

    const subscription = await cancelSubscription(
      workspaceId,
      { immediately },
      req,
      auth.user!.id,
    );

    return NextResponse.json({
      subscription,
      message: immediately
        ? 'Subscription canceled immediately.'
        : `Subscription will be canceled at the end of the current period (${subscription.currentPeriodEnd}).`,
    });
  } catch (err) {
    if (err instanceof BillingError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    if (err instanceof BillingValidationError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Cancel failed.';
    return NextResponse.json({ error: 'CANCEL_ERROR', message }, { status: 500 });
  }
}
