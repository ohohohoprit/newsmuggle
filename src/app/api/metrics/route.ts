import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getMetricsSummary, getRequestMetricsByRoute } from '@/lib/monitoring/metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/metrics
 * Returns aggregated metrics for the current user's workspace (or global
 * if admin). Includes API calls, jobs, AI usage, security, cache stats.
 *
 * Query params:
 *   - detail=true  (include per-route request metrics)
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const url = new URL(req.url);
  const includeDetail = url.searchParams.get('detail') === 'true';

  const summary = await getMetricsSummary();

  if (includeDetail && auth.user!.role === 'admin') {
    return NextResponse.json({
      ...summary,
      routes: getRequestMetricsByRoute(),
    });
  }

  return NextResponse.json(summary);
}
