import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { updateMemberRole, WorkspaceError } from '@/lib/workspace';
import { validateRole } from '@/lib/workspace-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces/:id/members/:memberId/role
 * Change a member's role. Requires owner or admin.
 * Body: { role: 'admin' | 'editor' | 'viewer' }  (owner is not assignable)
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; memberId: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { id: workspaceId, memberId } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const newRole = validateRole(body.role);

    const member = await updateMemberRole(
      workspaceId,
      memberId,
      auth.user!.id,
      newRole,
      req,
    );

    return NextResponse.json({ member });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to update member role.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
