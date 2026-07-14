import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getFile } from '@/lib/files/service';
import { FileError } from '@/lib/files/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/files/:id
 * Get file metadata. Verifies workspace access.
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
    const file = await getFile(id, auth.user!.id);
    return NextResponse.json({ file });
  } catch (err) {
    if (err instanceof FileError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to get file.';
    return NextResponse.json({ error: 'FILE_ERROR', message }, { status: 500 });
  }
}
