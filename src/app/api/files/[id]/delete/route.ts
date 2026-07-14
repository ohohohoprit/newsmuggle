import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { deleteFile } from '@/lib/files/service';
import { FileError } from '@/lib/files/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/files/:id/delete
 * Soft-delete a file. Only the uploader or workspace owner/admin can delete.
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
    await deleteFile(id, auth.user!.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof FileError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Delete failed.';
    return NextResponse.json({ error: 'FILE_ERROR', message }, { status: 500 });
  }
}
