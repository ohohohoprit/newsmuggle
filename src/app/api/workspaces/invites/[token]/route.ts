import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getInviteByToken, WorkspaceError } from '@/lib/workspace';
import { validateInviteToken } from '@/lib/workspace-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces/invites/:token
 * Look up an invite by token. Public (no auth required) so invitees can
 * preview the workspace before signing in.
 *
 * Returns: workspace name, role, inviter, expiry, status. Never returns
 * sensitive member data.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  try {
    const validToken = validateInviteToken(token);
    const invite = await getInviteByToken(validToken);
    return NextResponse.json({ invite });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to load invite.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
