import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { listMembers, WorkspaceError } from '@/lib/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces/:id/members
 * List all members of a workspace. Requires any active membership.
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
    const members = await listMembers(workspaceId, auth.user!.id);
    return NextResponse.json({ members, count: members.length });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to list members.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
