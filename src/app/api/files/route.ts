import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { listFiles } from '@/lib/files/service';
import { FileError } from '@/lib/files/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/files
 * List files for the caller's active workspace.
 *
 * Query params:
 *   - workspaceId, category, sourceType, limit, offset
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const url = new URL(req.url);
  let workspaceId = url.searchParams.get('workspaceId') ?? undefined;
  const category = url.searchParams.get('category') ?? undefined;
  const sourceType = url.searchParams.get('sourceType') ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;

  if (!workspaceId) {
    const { db } = await import('@/lib/db');
    const user = await db.user.findUnique({
      where: { id: auth.user!.id },
      select: { activeWorkspaceId: true },
    });
    workspaceId = user?.activeWorkspaceId ?? undefined;
  }
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'NO_ACTIVE_WORKSPACE', message: 'You do not have an active workspace.' },
      { status: 400 },
    );
  }

  try {
    const result = await listFiles(workspaceId, auth.user!.id, {
      ...(category ? { category } : {}),
      ...(sourceType ? { sourceType } : {}),
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FileError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to list files.';
    return NextResponse.json({ error: 'FILE_ERROR', message }, { status: 500 });
  }
}
