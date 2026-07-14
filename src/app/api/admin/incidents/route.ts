import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { listIncidents } from '@/lib/monitoring/incidents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/incidents
 * List service incidents. Admin only.
 *
 * Query params:
 *   - status=<status>      (open|monitoring|resolved|postmortem)
 *   - severity=<severity>  (info|warning|critical|maintenance)
 *   - serviceName=<name>   (database|ai_provider|billing|studio|notifications|global)
 *   - limit, offset
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
  const status = url.searchParams.get('status') ?? undefined;
  const severity = url.searchParams.get('severity') ?? undefined;
  const serviceName = url.searchParams.get('serviceName') ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 100);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;

  const result = await listIncidents({
    ...(status ? { status } : {}),
    ...(severity ? { severity } : {}),
    ...(serviceName ? { serviceName } : {}),
    limit,
    offset,
  });

  return NextResponse.json(result);
}
