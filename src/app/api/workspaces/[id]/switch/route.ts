import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { switchActiveWorkspace, WorkspaceError } from '@/lib/workspace';
import { validateWorkspaceId } from '@/lib/workspace-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces/:id/switch
 * Set the workspace as the user's active workspace. Requires membership.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const workspaceId = validateWorkspaceId(id);
    const workspace = await switchActiveWorkspace(auth.user!.id, workspaceId, req);
    return NextResponse.json({ workspace, active: true });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to switch workspace.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
