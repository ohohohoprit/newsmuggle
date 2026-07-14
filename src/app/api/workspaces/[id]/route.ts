import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getWorkspaceDetail, updateWorkspace, WorkspaceError } from '@/lib/workspace';
import {
  validateWorkspaceName,
  validateWorkspaceDescription,
  validateWorkspaceId,
} from '@/lib/workspace-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces/:id
 * Get full workspace detail (members, owner, settings). Requires membership.
 */
export async function GET(
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
    const workspace = await getWorkspaceDetail(workspaceId, auth.user!.id);
    return NextResponse.json({ workspace });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to load workspace.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}

/**
 * PATCH /api/workspaces/:id
 * Update workspace metadata. Requires admin or owner.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const workspaceId = validateWorkspaceId(id);
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = validateWorkspaceName(body.name);
    if (body.description !== undefined)
      update.description = validateWorkspaceDescription(body.description);
    if (body.avatar !== undefined) {
      if (typeof body.avatar !== 'string') {
        throw new Error('Avatar must be a string.');
      }
      update.avatar = body.avatar.trim() || undefined;
    }
    if (body.settings !== undefined) {
      if (typeof body.settings !== 'object' || body.settings === null || Array.isArray(body.settings)) {
        throw new Error('Settings must be a JSON object.');
      }
      update.settings = body.settings as Record<string, unknown>;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: 'NO_FIELDS', message: 'No updatable fields provided.' },
        { status: 400 },
      );
    }

    const workspace = await updateWorkspace(workspaceId, auth.user!.id, update, req);
    return NextResponse.json({ workspace });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to update workspace.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
