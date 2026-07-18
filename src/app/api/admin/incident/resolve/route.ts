import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { resolveIncident } from '@/lib/monitoring/incidents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/incident/resolve
 * Resolve a service incident. Admin only.
 *
 * Body:
 *   - id: string  (incident ID)
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

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Incident id is required.' },
      { status: 400 },
    );
  }

  try {
    const incident = await resolveIncident(id, auth.user!.id, req);
    return NextResponse.json({ incident });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to resolve incident.';
    return NextResponse.json({ error: 'INCIDENT_ERROR', message }, { status: 500 });
  }
}
