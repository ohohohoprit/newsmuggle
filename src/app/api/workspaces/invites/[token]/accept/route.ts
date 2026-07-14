import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { acceptInvite, WorkspaceError } from '@/lib/workspace';
import { validateInviteToken } from '@/lib/workspace-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces/invites/:token/accept
 * Accept a workspace invite as the authenticated user.
 * The signed-in user's email must match the invite email.
 *
 * On success: creates an active membership, marks invite as accepted,
 * and returns the joined workspace summary (not auto-activated).
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { token } = await ctx.params;

  try {
    const validToken = validateInviteToken(token);
    const workspace = await acceptInvite(validToken, auth.user!.id, req);
    return NextResponse.json({ workspace, accepted: true });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to accept invite.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
