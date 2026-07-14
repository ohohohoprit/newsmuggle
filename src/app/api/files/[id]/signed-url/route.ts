import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getFile, createSignedUrl } from '@/lib/files/service';
import { FileError } from '@/lib/files/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/files/:id/signed-url
 * Generate a signed download URL for a file.
 *
 * Query params:
 *   - expiresInHours: number (default: 24, max: 720 = 30 days)
 *   - downloadLimit: number (default: 0 = unlimited)
 *
 * Returns: { token, url, fileAssetId, filename, expiresAt, downloadLimit, downloadCount }
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
  const url = new URL(req.url);
  const expiresInHours = Math.min(parseInt(url.searchParams.get('expiresInHours') ?? '24', 10) || 24, 720);
  const downloadLimit = Math.max(0, parseInt(url.searchParams.get('downloadLimit') ?? '0', 10) || 0);

  try {
    // Verify access first
    await getFile(id, auth.user!.id);

    const signedUrl = await createSignedUrl(id, auth.user!.id, { expiresInHours, downloadLimit });
    return NextResponse.json(signedUrl);
  } catch (err) {
    if (err instanceof FileError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to generate signed URL.';
    return NextResponse.json({ error: 'FILE_ERROR', message }, { status: 500 });
  }
}
