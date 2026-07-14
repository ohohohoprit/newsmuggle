import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getUsageSummary } from '@/lib/billing/quota';
import { requireMembership } from '@/lib/workspace';
import { BillingError } from '@/lib/billing/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/usage
 * Returns the usage summary for the caller's active workspace:
 * generations used/limit/remaining, tokens, cost, storage, team seats.
 *
 * Query params:
 *   - workspaceId=<id>  (optional)
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const url = new URL(req.url);
  let workspaceId = url.searchParams.get('workspaceId') ?? undefined;

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
    await requireMembership(workspaceId, auth.user!.id);
    const usage = await getUsageSummary(workspaceId);
    return NextResponse.json(usage);
  } catch (err) {
    if (err instanceof BillingError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to load usage.';
    return NextResponse.json({ error: 'BILLING_ERROR', message }, { status: 500 });
  }
}
