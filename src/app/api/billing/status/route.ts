import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getBillingStatus } from '@/lib/billing/status';
import { BillingError } from '@/lib/billing/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/status
 * Returns the full billing status for the caller's active workspace:
 * subscription, plan, usage, entitlements, renewal info.
 *
 * Query params:
 *   - workspaceId=<id>  (optional: use a specific workspace instead of active)
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceIdParam = url.searchParams.get('workspaceId');

  let workspaceId = workspaceIdParam ?? undefined;
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

  try {
    const status = await getBillingStatus(workspaceId, auth.user!.id);
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof BillingError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to load billing status.';
    return NextResponse.json({ error: 'BILLING_ERROR', message }, { status: 500 });
  }
}
