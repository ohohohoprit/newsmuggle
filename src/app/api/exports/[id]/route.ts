import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getExport } from '@/lib/exports/service';
import { FileError } from '@/lib/files/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/exports/:id
 * Get export job details by ID.
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
    const job = await getExport(id, auth.user!.id);
    return NextResponse.json({ job: job });
  } catch (err) {
    if (err instanceof FileError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to get export.';
    return NextResponse.json({ error: 'EXPORT_ERROR', message }, { status: 500 });
  }
}
