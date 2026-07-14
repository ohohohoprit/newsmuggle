import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { removeMember, WorkspaceError } from '@/lib/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/workspaces/:id/members/:memberId
 * Remove a member from the workspace. Requires owner or admin.
 * The owner cannot be removed.
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string; memberId: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { id: workspaceId, memberId } = await ctx.params;

  try {
    await removeMember(workspaceId, memberId, auth.user!.id, req);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to remove member.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
