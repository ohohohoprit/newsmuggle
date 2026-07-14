import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getStudioMetrics } from '@/lib/studio/metrics';
import { requireStudioAccess } from '@/lib/studio/entitlements';
import { StudioError } from '@/lib/studio/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/studio/metrics
 * Returns aggregated studio metrics for the workspace:
 * totalFollowers, totalViews, byProvider breakdown, recentContent,
 * followerGrowth, topContent.
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
    const metrics = await getStudioMetrics(workspaceId, auth.user!.id);
    return NextResponse.json(metrics);
  } catch (err) {
    if (err instanceof StudioError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to load metrics.';
    return NextResponse.json({ error: 'STUDIO_ERROR', message }, { status: 500 });
  }
}
