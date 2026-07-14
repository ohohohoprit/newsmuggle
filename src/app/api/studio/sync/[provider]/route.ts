import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { syncAccount, syncAllAccounts } from '@/lib/studio/sync';
import { requireStudioAccess } from '@/lib/studio/entitlements';
import { StudioError } from '@/lib/studio/errors';
import { validateProvider, validateSyncType } from '@/lib/studio/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/studio/sync/:provider
 * Trigger a sync for a specific provider's connected account.
 *
 * Body (optional):
 *   - workspaceId: string
 *   - type: 'full' | 'incremental' | 'metrics' | 'content' | 'audience'  (default: incremental)
 *
 * If :provider is 'all', syncs all connected accounts in the workspace.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { provider: providerParam } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body
  }

  try {
    const url = new URL(req.url);
    let workspaceId: string | undefined = (body.workspaceId as string) ?? url.searchParams.get('workspaceId') ?? undefined;

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

    await requireStudioAccess(workspaceId);

    // 'all' is a special case — sync all connected accounts
    if (providerParam.toLowerCase() === 'all') {
      const results = await syncAllAccounts(workspaceId, auth.user!.id, req);
      return NextResponse.json({ results, count: results.length });
    }

    const provider = validateProvider(providerParam);
    const type = validateSyncType(body.type);

    const result = await syncAccount(workspaceId, auth.user!.id, provider, { type, triggeredBy: 'user' }, req);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof StudioError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Sync failed.';
    return NextResponse.json({ error: 'STUDIO_ERROR', message }, { status: 500 });
  }
}
