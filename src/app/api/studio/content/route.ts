import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { listContent } from '@/lib/studio/metrics';
import { requireStudioAccess } from '@/lib/studio/entitlements';
import { StudioError } from '@/lib/studio/errors';
import { validateProvider, validateContentType, validateLimit, validateOffset, validateDateRange } from '@/lib/studio/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/studio/content
 * List content items (videos, posts, reels) from connected accounts.
 *
 * Query params:
 *   - workspaceId=<id>     (optional)
 *   - provider=<slug>      (optional: youtube|instagram|...)
 *   - type=<type>          (optional: video|post|reel|story|short)
 *   - limit=<n>            (default 50, max 200)
 *   - offset=<n>           (default 0)
 *   - since=ISO8601        (optional)
 *   - until=ISO8601        (optional)
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
    await requireStudioAccess(workspaceId);

    const providerParam = url.searchParams.get('provider');
    const provider = providerParam ? validateProvider(providerParam) : undefined;
    const type = validateContentType(url.searchParams.get('type'));
    const limit = validateLimit(url.searchParams.get('limit'), 50, 200);
    const offset = validateOffset(url.searchParams.get('offset'));
    const { since, until } = validateDateRange(url.searchParams.get('since'), url.searchParams.get('until'));

    const result = await listContent(workspaceId, auth.user!.id, {
      ...(provider ? { provider } : {}),
      ...(type ? { type } : {}),
      limit,
      offset,
      ...(since ? { since } : {}),
      ...(until ? { until } : {}),
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof StudioError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to load content.';
    return NextResponse.json({ error: 'STUDIO_ERROR', message }, { status: 500 });
  }
}
