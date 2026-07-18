import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { queryAuditLogs, getAuditStats } from '@/lib/monitoring/audit';
import { getClientInfo } from '@/lib/security/middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/audit
 * Query audit logs with filters. Admin only.
 *
 * Query params:
 *   - userId=<id>      (optional)
 *   - action=<action>  (optional: login|logout|register|tool_run|etc.)
 *   - status=<status>  (optional: success|failed)
 *   - since=ISO8601    (optional)
 *   - until=ISO8601    (optional)
 *   - limit=<n>        (default 50, max 200)
 *   - offset=<n>       (default 0)
 *   - stats=true       (return stats instead of log items)
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
  const userId = url.searchParams.get('userId') ?? undefined;
  const action = url.searchParams.get('action') ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;
  const sinceRaw = url.searchParams.get('since');
  const untilRaw = url.searchParams.get('until');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;
  const wantStats = url.searchParams.get('stats') === 'true';

  const since = sinceRaw ? new Date(sinceRaw) : undefined;
  const until = untilRaw ? new Date(untilRaw) : undefined;
  if ((sinceRaw && isNaN(since?.getTime() ?? NaN)) || (untilRaw && isNaN(until?.getTime() ?? NaN))) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Invalid date format. Use ISO 8601.' },
      { status: 400 },
    );
  }

  if (wantStats) {
    const stats = await getAuditStats({ since });
    return NextResponse.json(stats);
  }

  const { ip } = getClientInfo(req);
  const result = await queryAuditLogs(
    {
      ...(userId ? { userId } : {}),
      ...(action ? { action } : {}),
      ...(status ? { status } : {}),
      ...(since ? { since } : {}),
      ...(until ? { until } : {}),
      limit,
      offset,
    },
    { userId: auth.user!.id, ip: ip ?? undefined },
  );

  return NextResponse.json(result);
}
