import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { saveFile } from '@/lib/files/service';
import { canUploadFile } from '@/lib/files/entitlements';
import { FileError } from '@/lib/files/errors';
import { validateFileCategory, validateFilename, validateMimeType, validateTags, validateDescription, validateExpiryHours } from '@/lib/files/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * POST /api/files/upload
 * Upload a file to the workspace's storage.
 *
 * Multipart form data:
 *   - file: File (required)
 *   - category?: string (upload|export|generated|studio, default: upload)
 *   - description?: string
 *   - tags?: string (comma-separated)
 *   - expiresInHours?: number
 *   - workspaceId?: string
 *
 * Returns the created FileAsset.
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'No file provided.' }, { status: 400 });
    }

    const category = validateFileCategory(formData.get('category'));
    const description = validateDescription(formData.get('description'));
    const tagsRaw = formData.get('tags');
    const tags = validateTags(tagsRaw ? String(tagsRaw).split(',') : []);
    const expiresInHours = validateExpiryHours(formData.get('expiresInHours'));
    let workspaceId: string | undefined = (formData.get('workspaceId') as string) ?? undefined;

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

    // Validate filename
    const filename = validateFilename(file.name);
    const mimeType = validateMimeType(file.type);

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    // Check storage entitlements + limit
    const canUpload = await canUploadFile(workspaceId, data.length);
    if (!canUpload.allowed) {
      return NextResponse.json(
        { error: 'STORAGE_LIMIT_EXCEEDED', message: canUpload.reason, usedMb: canUpload.usedMb, limitMb: canUpload.limitMb },
        { status: 403 },
      );
    }

    const fileAsset = await saveFile({
      workspaceId,
      uploadedById: auth.user!.id,
      filename,
      mimeType,
      data,
      category,
      sourceType: 'manual_upload',
      ...(description ? { description } : {}),
      tags,
      ...(expiresInHours ? { expiresAt: expiresInHours } : {}),
    });

    return NextResponse.json({ file: fileAsset }, { status: 201 });
  } catch (err) {
    if (err instanceof FileError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: 'FILE_ERROR', message }, { status: 500 });
  }
}
