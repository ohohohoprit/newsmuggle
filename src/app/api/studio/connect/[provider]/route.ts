import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { initiateConnect, completeConnect } from '@/lib/studio/accounts';
import { requireStudioAccess } from '@/lib/studio/entitlements';
import { StudioError } from '@/lib/studio/errors';
import { validateProvider } from '@/lib/studio/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * POST /api/studio/connect/:provider
 * Initiate OAuth flow for a social provider.
 *
 * Body (optional):
 *   - workspaceId: string  (optional: use specific workspace)
 *
 * Returns: { provider, authUrl, state }
 *
 * The frontend should redirect the user to `authUrl`. After the user
 * authorizes, the provider redirects to /api/studio/connect/:provider/callback
 * which calls completeConnect() to exchange the code and store the account.
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
    const result = await initiateConnect(workspaceId, auth.user!.id, provider);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof StudioError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to initiate connection.';
    return NextResponse.json({ error: 'STUDIO_ERROR', message }, { status: 500 });
  }
}
