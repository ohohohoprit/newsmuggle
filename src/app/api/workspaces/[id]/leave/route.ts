import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { leaveWorkspace, WorkspaceError } from '@/lib/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces/:id/leave
 * The authenticated user leaves the workspace voluntarily.
 * The owner cannot leave (must transfer ownership or delete the workspace).
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

  try {
    await leaveWorkspace(workspaceId, auth.user!.id, req);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to leave workspace.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
