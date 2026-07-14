import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { getServiceStatuses } from '@/lib/monitoring/health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/services/status
 * Get service-by-service health status for the admin monitoring dashboard.
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

  const services = await getServiceStatuses();
  const overallStatus = services.some((s) => s.status === 'unhealthy')
    ? 'unhealthy'
    : services.some((s) => s.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
  });
}
