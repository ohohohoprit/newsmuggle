import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { listSecurityEvents, getSecurityStats, resolveSecurityEvent } from '@/lib/security/events';
import { validateSecurityEventType, validateSeverity, validateLimit, validateOffset } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security-events
 * List security events with filters. Admin only.
 *
 * Query params:
 *   - userId, workspaceId, eventType, severity, unresolvedOnly
 *   - since, until (ISO 8601)
 *   - limit, offset
 *   - stats=true  (return stats summary instead of items)
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
  const workspaceId = url.searchParams.get('workspaceId') ?? undefined;
  const eventType = validateSecurityEventType(url.searchParams.get('eventType'));
  const severity = validateSeverity(url.searchParams.get('severity'));
  const unresolvedOnly = url.searchParams.get('unresolvedOnly') === 'true';
  const sinceRaw = url.searchParams.get('since');
  const untilRaw = url.searchParams.get('until');
  const since = sinceRaw ? new Date(sinceRaw) : undefined;
  const until = untilRaw ? new Date(untilRaw) : undefined;
  const limit = validateLimit(url.searchParams.get('limit'));
  const offset = validateOffset(url.searchParams.get('offset'));
  const wantStats = url.searchParams.get('stats') === 'true';

  if (wantStats) {
    const stats = await getSecurityStats({ since });
    return NextResponse.json(stats);
  }

  const result = await listSecurityEvents({
    ...(userId ? { userId } : {}),
    ...(workspaceId ? { workspaceId } : {}),
    ...(eventType ? { eventType } : {}),
    ...(severity ? { severity } : {}),
    unresolvedOnly,
    ...(since ? { since } : {}),
    ...(until ? { until } : {}),
    limit,
    offset,
  });

  return NextResponse.json(result);
}

/**
 * POST /api/admin/security-events
 * Resolve a security event. Admin only.
 *
 * Body:
 *   - id: string  (event ID to resolve)
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
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Event id is required.' }, { status: 400 });
  }

  await resolveSecurityEvent(id, auth.user!.id);
  return NextResponse.json({ success: true });
}
