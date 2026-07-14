import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getAccountByProvider } from '@/lib/studio/accounts';
import { requireStudioAccess } from '@/lib/studio/entitlements';
import { StudioError } from '@/lib/studio/errors';
import { validateProvider } from '@/lib/studio/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/studio/accounts/:provider
 * Get a specific connected account by provider.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { provider: providerParam } = await ctx.params;

  try {
    const provider = validateProvider(providerParam);
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

    await requireStudioAccess(workspaceId);
    const account = await getAccountByProvider(workspaceId, auth.user!.id, provider);
    return NextResponse.json({ account });
  } catch (err) {
    if (err instanceof StudioError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to get account.';
    return NextResponse.json({ error: 'STUDIO_ERROR', message }, { status: 500 });
  }
}
