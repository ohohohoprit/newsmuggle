import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { changePlan } from '@/lib/billing/subscription';
import { requireMembership } from '@/lib/workspace';
import { BillingError, BillingValidationError, WorkspaceNotBillableError } from '@/lib/billing/errors';
import { validatePlanSlug, validateInterval, validateWorkspaceId, validateProrate } from '@/lib/billing/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/upgrade
 * Upgrade the workspace to a higher plan. Takes effect immediately with proration.
 *
 * Body:
 *   - targetPlanSlug: 'starter' | 'creator' | 'agency'  (required)
 *   - interval?: 'monthly' | 'yearly'                    (default: current)
 *   - workspaceId?: string                               (optional)
 *   - prorate?: boolean                                  (default: true)
 *
 * Note: For paid plans with a real provider (Stripe/Razorpay), this endpoint
 * creates a checkout session instead of changing the plan directly. The caller
 * should use /api/billing/checkout for new subscriptions.
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const targetPlanSlug = validatePlanSlug(body.targetPlanSlug ?? body.planSlug);
    const interval = validateInterval(body.interval);
    const workspaceIdParam = validateWorkspaceId(body.workspaceId);
    const prorate = validateProrate(body.prorate);

    // Resolve workspace
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

    // Verify workspace access (owner or admin only)
    const membership = await requireMembership(workspaceId, auth.user!.id);
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new WorkspaceNotBillableError(workspaceId);
    }

    const result = await changePlan(
      workspaceId,
      targetPlanSlug,
      { interval, prorate },
      req,
      auth.user!.id,
    );

    return NextResponse.json({
      ...result,
      message: result.effectiveImmediately
        ? `Plan upgraded to ${targetPlanSlug} successfully.`
        : `Plan change to ${targetPlanSlug} scheduled for the end of the current period.`,
    });
  } catch (err) {
    if (err instanceof BillingError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    if (err instanceof BillingValidationError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Upgrade failed.';
    return NextResponse.json({ error: 'UPGRADE_ERROR', message }, { status: 500 });
  }
}
