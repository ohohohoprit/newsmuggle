import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { listExports } from '@/lib/exports/service';
import { FileError } from '@/lib/files/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/exports
 * List export jobs for the caller's active workspace.
 *
 * Query params:
 *   - workspaceId, status, format, limit, offset
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const url = new URL(req.url);
  let workspaceId = url.searchParams.get('workspaceId') ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;
  const format = url.searchParams.get('format') ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 100);
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
    const result = await listExports(workspaceId, auth.user!.id, {
      ...(status ? { status } : {}),
      ...(format ? { format } : {}),
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FileError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to list exports.';
    return NextResponse.json({ error: 'EXPORT_ERROR', message }, { status: 500 });
  }
}
