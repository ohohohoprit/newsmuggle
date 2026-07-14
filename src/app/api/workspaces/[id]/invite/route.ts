import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { inviteMember, listInvites, WorkspaceError } from '@/lib/workspace';
import { validateInviteEmail, validateInviteRole } from '@/lib/workspace-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces/:id/invite
 * Invite a user to the workspace by email. Requires admin or owner.
 * Body: { email: string, role: 'admin' | 'editor' | 'viewer' }
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { id: workspaceId } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const email = validateInviteEmail(body.email);
    const role = validateInviteRole(body.role);

    const invite = await inviteMember(
      workspaceId,
      auth.user!.id,
      { email, role },
      req,
    );

    return NextResponse.json({ invite }, { status: 201 });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to send invite.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}

/**
 * GET /api/workspaces/:id/invite
 * List all invites for the workspace. Requires admin or owner.
 * (Named `invite` singular per spec, but acts as the invites collection endpoint.)
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { id: workspaceId } = await ctx.params;

  try {
    const invites = await listInvites(workspaceId, auth.user!.id);
    return NextResponse.json({ invites, count: invites.length });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to list invites.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
