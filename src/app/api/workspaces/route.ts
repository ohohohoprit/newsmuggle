import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import {
  listWorkspaces,
  createTeamWorkspace,
  WorkspaceError,
} from '@/lib/workspace';
import {
  validateWorkspaceName,
  validateWorkspaceDescription,
  validateWorkspaceSlug,
  validateWorkspaceType,
} from '@/lib/workspace-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces
 * List all workspaces the authenticated user belongs to.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const workspaces = await listWorkspaces(auth.user!.id);

  return NextResponse.json({
    workspaces,
    active: workspaces.find((w) => w.isActive) ?? workspaces[0] ?? null,
    count: workspaces.length,
  });
}

/**
 * POST /api/workspaces
 * Create a new team workspace. The creator becomes the owner.
 * Personal workspaces are auto-created on first login — this endpoint is
 * for explicit team workspace creation.
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const name = validateWorkspaceName(body.name);
    const description = validateWorkspaceDescription(body.description);
    const slug = validateWorkspaceSlug(body.slug);
    const type = validateWorkspaceType(body.type);
    const avatar =
      typeof body.avatar === 'string' && body.avatar.trim()
        ? body.avatar.trim()
        : undefined;

    const workspace = await createTeamWorkspace(
      auth.user!.id,
      { name, description, slug, type, avatar },
      req,
    );

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err) {
    if (err instanceof WorkspaceError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to create workspace.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
