import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { disconnectAccount } from '@/lib/studio/accounts';
import { requireStudioAccess } from '@/lib/studio/entitlements';
import { StudioError } from '@/lib/studio/errors';
import { validateProvider } from '@/lib/studio/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/studio/disconnect/:provider
 * Disconnect a social account (soft delete — tokens are cleared, account
 * is marked as not connected, but historical data is preserved).
 *
 * Body (optional):
 *   - workspaceId: string
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
    const provider = validateProvider(providerParam);

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
    await disconnectAccount(workspaceId, auth.user!.id, provider, req);
    return NextResponse.json({ success: true, provider });
  } catch (err) {
    if (err instanceof StudioError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to disconnect account.';
    return NextResponse.json({ error: 'STUDIO_ERROR', message }, { status: 500 });
  }
}
