import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getFile, readFileContent, recordDownload, verifySignedUrl } from '@/lib/files/service';
import { FileError } from '@/lib/files/errors';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * GET /api/files/:id/download
 * Download a file. Supports signed URL tokens (for public/no-auth downloads).
 *
 * Query params:
 *   - token: string (signed URL token — allows download without workspace membership)
 *
 * If no token is provided, requires auth + workspace membership.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  // Get client info
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : null;
  const userAgent = req.headers.get('user-agent');

  try {
    let userId: string | null = null;
    let downloadMethod = 'direct';
    let signedUrlTokenId: string | undefined;

    // If token is provided, verify it (no auth required)
    if (token) {
      const { fileAsset, tokenRecord } = await verifySignedUrl(token, { ipAddress: ip ?? undefined });
      // Use the file asset from the token verification (it's tied to the fileAssetId)
      if (fileAsset.id !== id) {
        return NextResponse.json(
          { error: 'SIGNED_URL_MISMATCH', message: 'Token does not match this file.' },
          { status: 403 },
        );
      }
      downloadMethod = 'signed_url';
      signedUrlTokenId = tokenRecord.id;
    } else {
      // No token — require auth
      const auth = await requireAuth(req);
      if (!auth.authenticated) {
        return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
      }
      userId = auth.user!.id;

      // Verify access + get file
      await getFile(id, userId);
    }

    // Read file content (skip access check if downloaded via signed URL — the token was already verified)
    const { data, mimeType, filename } = await readFileContent(id, userId ?? 'signed-url-user', !!token);

    // Record the download
    await recordDownload(id, userId, {
      ...(ip ? { ipAddress: ip } : {}),
      ...(userAgent ? { userAgent } : {}),
      method: downloadMethod,
      ...(signedUrlTokenId ? { signedUrlTokenId } : {}),
    });

    // Return the file as a download
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(data.length),
      },
    });
  } catch (err) {
    if (err instanceof FileError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Download failed.';
    return NextResponse.json({ error: 'FILE_ERROR', message }, { status: 500 });
  }
}
