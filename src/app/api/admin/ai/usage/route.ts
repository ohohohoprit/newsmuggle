import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { getUsageSummary } from '@/lib/ai/metrics';
import { validateLimit, validateOffset } from '@/lib/tools/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/ai/usage
 * Aggregated AI usage stats (tokens, cost, latency) across all providers.
 * Optional query params:
 *   - workspaceId=<id>  (scope to a workspace)
 *   - since=ISO8601     (start date)
 *   - until=ISO8601     (end date)
 *
 * Admin only.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId') || undefined;
  const sinceRaw = url.searchParams.get('since');
  const untilRaw = url.searchParams.get('until');
  const since = sinceRaw ? new Date(sinceRaw) : undefined;
  const until = untilRaw ? new Date(untilRaw) : undefined;

  if ((sinceRaw && isNaN(since?.getTime() ?? NaN)) || (untilRaw && isNaN(until?.getTime() ?? NaN))) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Invalid date format for since/until. Use ISO 8601.' },
      { status: 400 },
    );
  }

  const summary = await getUsageSummary({ workspaceId, since, until });

  return NextResponse.json(summary);
}
