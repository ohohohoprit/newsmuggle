import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { flagAbuse, listAbuseFlags, resolveAbuseFlag } from '@/lib/security/abuse';
import { validateAbuseFlagType, validateLimit, validateOffset } from '@/lib/security/validation';
import { SecurityError } from '@/lib/security/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security/flags
 * List abuse detection flags. Admin only.
 *
 * Query params:
 *   - userId, workspaceId, ip, flagType, unresolvedOnly
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
  const userId = url.searchParams.get('userId') ?? undefined;
  const workspaceId = url.searchParams.get('workspaceId') ?? undefined;
  const ip = url.searchParams.get('ip') ?? undefined;
  const flagType = validateAbuseFlagType(url.searchParams.get('flagType'));
  const unresolvedOnly = url.searchParams.get('unresolvedOnly') === 'true';
  const limit = validateLimit(url.searchParams.get('limit'));
  const offset = validateOffset(url.searchParams.get('offset'));

  const result = await listAbuseFlags({
    ...(userId ? { userId } : {}),
    ...(workspaceId ? { workspaceId } : {}),
    ...(ip ? { ip } : {}),
    ...(flagType ? { flagType } : {}),
    unresolvedOnly,
    limit,
    offset,
  });

  return NextResponse.json(result);
}

/**
 * POST /api/admin/security/flags
 * Manually flag an abuse pattern or resolve an existing flag.
 *
 * Body (flag):
 *   - action: 'flag'
 *   - userId?, workspaceId?, ip?
 *   - flagType: rapid_requests|failed_auth_burst|excessive_tool_runs|quota_abuse|suspicious_pattern
 *   - riskScore: number (0-100)
 *   - autoBlock?: boolean
 *   - evidence?: object
 *
 * Body (resolve):
 *   - action: 'resolve'
 *   - id: string (flag ID)
 *   - resolution: false_positive|confirmed|escalated
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
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'flag') {
      const flagType = validateAbuseFlagType(body.flagType);
      if (!flagType) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: 'flagType is required.' },
          { status: 400 },
        );
      }
      const riskScore = typeof body.riskScore === 'number' ? Math.max(0, Math.min(100, body.riskScore)) : 50;
      const flag = await flagAbuse({
        userId: typeof body.userId === 'string' ? body.userId : null,
        workspaceId: typeof body.workspaceId === 'string' ? body.workspaceId : null,
        ip: typeof body.ip === 'string' ? body.ip : null,
        flagType,
        riskScore,
        evidence: body.evidence as Record<string, unknown> | undefined,
        autoBlock: typeof body.autoBlock === 'boolean' ? body.autoBlock : false,
      });
      return NextResponse.json({ flag }, { status: 201 });
    }

    if (action === 'resolve') {
      const id = typeof body.id === 'string' ? body.id : '';
      const resolution = typeof body.resolution === 'string' ? body.resolution : 'confirmed';
      if (!id) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: 'Flag id is required.' },
          { status: 400 },
        );
      }
      if (!['false_positive', 'confirmed', 'escalated'].includes(resolution)) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: 'resolution must be false_positive|confirmed|escalated.' },
          { status: 400 },
        );
      }
      await resolveAbuseFlag(id, auth.user!.id, resolution as 'false_positive' | 'confirmed' | 'escalated');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'action must be "flag" or "resolve".' },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof SecurityError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to process security flag action.';
    return NextResponse.json({ error: 'SECURITY_ERROR', message }, { status: 500 });
  }
}
