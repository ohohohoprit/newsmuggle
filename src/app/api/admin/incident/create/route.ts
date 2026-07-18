import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { createIncident } from '@/lib/monitoring/incidents';
import { validateIncidentTitle, validateIncidentSeverity, validateServiceName } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/incident/create
 * Create a service incident. Admin only.
 *
 * Body:
 *   - title: string       (required)
 *   - description?: string
 *   - severity?: string   (info|warning|critical|maintenance, default: warning)
 *   - serviceName?: string
 *   - affectedUsers?: number
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const title = validateIncidentTitle(body.title);
    const severity = validateIncidentSeverity(body.severity);
    const serviceName = validateServiceName(body.serviceName);
    const description = typeof body.description === 'string' ? body.description : undefined;
    const affectedUsers = typeof body.affectedUsers === 'number' ? body.affectedUsers : undefined;

    const incident = await createIncident(
      {
        title,
        ...(description ? { description } : {}),
        severity,
        ...(serviceName ? { serviceName } : {}),
        ...(affectedUsers !== undefined ? { affectedUsers } : {}),
      },
      auth.user!.id,
      req,
    );

    return NextResponse.json({ incident }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create incident.';
    return NextResponse.json({ error: 'INCIDENT_ERROR', message }, { status: 400 });
  }
}
