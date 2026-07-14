import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { completeConnect } from '@/lib/studio/accounts';
import { requireStudioAccess } from '@/lib/studio/entitlements';
import { StudioError } from '@/lib/studio/errors';
import { validateProvider } from '@/lib/studio/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * GET /api/studio/connect/:provider/callback
 * OAuth callback handler. The provider redirects here with `code` and
 * `state` query params after the user authorizes.
 *
 * This endpoint exchanges the code for tokens, fetches the account
 * profile, and stores the connected account. Then redirects to the
 * frontend studio page with a success/error status.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    const url = new URL(req.url);
    return NextResponse.redirect(`${url.origin}/?auth_error=studio_unauthenticated`, 302);
  }

  const { provider: providerParam } = await ctx.params;
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${url.origin}/?studio_error=${encodeURIComponent(error)}`, 302);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${url.origin}/?studio_error=missing_params`, 302);
  }

  try {
    const provider = validateProvider(providerParam);

    // Extract workspaceId from state (the provider encoded it in buildAuthUrl)
    // The state format is base64(workspaceId:userId:random) for YouTube/Instagram
    let workspaceId: string | undefined;
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf8');
      workspaceId = decoded.split(':')[0];
    } catch {
      // state might be in a different format
    }

    if (!workspaceId) {
      // Fall back to user's active workspace
      const { db } = await import('@/lib/db');
      const user = await db.user.findUnique({
        where: { id: auth.user!.id },
        select: { activeWorkspaceId: true },
      });
      workspaceId = user?.activeWorkspaceId ?? undefined;
    }

    if (!workspaceId) {
      return NextResponse.redirect(`${url.origin}/?studio_error=no_workspace`, 302);
    }

    await requireStudioAccess(workspaceId);
    const account = await completeConnect(workspaceId, auth.user!.id, provider, code, state, req);

    // Redirect to frontend with success + account info
    return NextResponse.redirect(
      `${url.origin}/?studio_connected=${provider}&account=${encodeURIComponent(account.displayName ?? account.handle ?? '')}`,
      302,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed.';
    return NextResponse.redirect(
      `${url.origin}/?studio_error=${encodeURIComponent(message)}`,
      302,
    );
  }
}
