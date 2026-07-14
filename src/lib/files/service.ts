/**
 * File service — manages file assets with workspace-scoped access.
 *
 * Handles:
 *   - saving uploaded files to storage
 *   - reading file metadata + content
 *   - listing files (workspace-scoped, filterable)
 *   - soft-deleting files
 *   - generating signed download URLs (HMAC-signed tokens)
 *   - verifying signed URLs + download access
 *   - access control checks (workspace membership)
 *   - download tracking
 */
import { db } from '@/lib/db';
import crypto from 'crypto';
import { requireMembership } from '@/lib/workspace';
import { getStorageProvider, getStorageProviderBySlug, generateStorageKey } from '@/lib/files/storage';
import type { FileAssetDTO, UploadFileInput, SignedUrlDTO, FileDownloadDTO, StorageProviderSlug } from '@/lib/files/types';
import {
  FileNotFoundError,
  FileAccessDeniedError,
  FileError,
  SignedUrlExpiredError,
  SignedUrlRevokedError,
  DownloadLimitExceededError,
} from '@/lib/files/errors';

const SIGNED_URL_DEFAULT_EXPIRY_HOURS = 24;
const SIGNED_URL_SECRET = process.env.SIGNED_URL_SECRET ?? 'content-smuggler-signed-url-secret-change-me';

// ===== Helpers =====

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toDTO(f: {
  id: string;
  workspaceId: string;
  uploadedById: string;
  filename: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
  storageProvider: string;
  storageKey: string;
  category: string;
  sourceType: string | null;
  sourceId: string | null;
  description: string | null;
  tags: string | null;
  isPublic: boolean;
  downloadCount: number;
  expiresAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): FileAssetDTO {
  return {
    id: f.id,
    workspaceId: f.workspaceId,
    uploadedById: f.uploadedById,
    filename: f.filename,
    originalName: f.originalName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    storageProvider: f.storageProvider as FileAssetDTO['storageProvider'],
    category: f.category as FileAssetDTO['category'],
    sourceType: f.sourceType as FileAssetDTO['sourceType'],
    sourceId: f.sourceId,
    description: f.description,
    tags: safeParseJson<string[]>(f.tags, []),
    isPublic: f.isPublic,
    downloadCount: f.downloadCount,
    expiresAt: f.expiresAt?.toISOString() ?? null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    downloadUrl: null, // populated on demand
  };
}

// ===== Public API =====

/** Upload/save a file. */
export async function saveFile(input: UploadFileInput): Promise<FileAssetDTO> {
  const storage = getStorageProvider();
  const storageKey = generateStorageKey(input.workspaceId, input.filename);

  // Save to storage
  await storage.save(storageKey, input.data);

  // Get actual size from storage if not provided
  const sizeBytes = input.data.length || await storage.getSize(storageKey);

  // Create DB record
  const fileAsset = await db.fileAsset.create({
    data: {
      workspaceId: input.workspaceId,
      uploadedById: input.uploadedById,
      filename: input.filename,
      originalName: input.filename,
      mimeType: input.mimeType,
      sizeBytes,
      storageKey,
      storageProvider: storage.slug,
      category: input.category ?? 'upload',
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      description: input.description ?? null,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      isPublic: input.isPublic ?? false,
      expiresAt: input.expiresAt ?? null,
    },
  });

  return toDTO(fileAsset);
}

/** Get a file by ID (verifies workspace access). */
export async function getFile(id: string, userId: string): Promise<FileAssetDTO> {
  const file = await db.fileAsset.findUnique({ where: { id } });
  if (!file || file.deletedAt) {
    throw new FileNotFoundError(id);
  }

  // Check access: public files are accessible to all; private require workspace membership
  if (!file.isPublic) {
    await requireMembership(file.workspaceId, userId);
  }

  return toDTO(file);
}

/** List files for a workspace. */
export async function listFiles(
  workspaceId: string,
  userId: string,
  opts: {
    category?: string;
    sourceType?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ items: FileAssetDTO[]; total: number }> {
  await requireMembership(workspaceId, userId);
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = { workspaceId, deletedAt: null };
  if (opts.category) where.category = opts.category;
  if (opts.sourceType) where.sourceType = opts.sourceType;

  const [items, total] = await Promise.all([
    db.fileAsset.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    db.fileAsset.count({ where }),
  ]);

  return { items: items.map(toDTO), total };
}

/** Soft-delete a file. */
export async function deleteFile(id: string, userId: string): Promise<void> {
  const file = await db.fileAsset.findUnique({ where: { id } });
  if (!file || file.deletedAt) {
    throw new FileNotFoundError(id);
  }

  // Only the uploader or workspace owner/admin can delete
  const membership = await requireMembership(file.workspaceId, userId);
  if (file.uploadedById !== userId && membership.role !== 'owner' && membership.role !== 'admin') {
    throw new FileAccessDeniedError(id, userId);
  }

  // Soft-delete in DB
  await db.fileAsset.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Log the access
  await db.fileAccessLog.create({
    data: {
      fileAssetId: id,
      userId,
      action: 'delete',
      success: true,
    },
  }).catch(() => {});

  // Note: we don't delete from storage immediately — the cleanup job handles that
  // after the soft-delete grace period (7 days)
}

/** Read file content from storage. */
export async function readFileContent(id: string, userId: string, skipAccessCheck = false): Promise<{ data: Buffer; mimeType: string; filename: string }> {
  const file = await db.fileAsset.findUnique({ where: { id } });
  if (!file || file.deletedAt) {
    throw new FileNotFoundError(id);
  }

  if (!file.isPublic && !skipAccessCheck) {
    await requireMembership(file.workspaceId, userId);
  }

  const storage = getStorageProviderBySlug(file.storageProvider as StorageProviderSlug);
  const data = await storage.read(file.storageKey);

  return { data, mimeType: file.mimeType, filename: file.filename };
}

/** Record a download (for tracking). */
export async function recordDownload(
  fileAssetId: string,
  userId: string | null,
  opts: { ipAddress?: string; userAgent?: string; method?: string; signedUrlTokenId?: string } = {},
): Promise<FileDownloadDTO> {
  const download = await db.fileDownload.create({
    data: {
      fileAssetId,
      userId,
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent ?? null,
      signedUrlTokenId: opts.signedUrlTokenId ?? null,
      downloadMethod: opts.method ?? 'direct',
    },
  });

  // Increment download count
  await db.fileAsset.update({
    where: { id: fileAssetId },
    data: { downloadCount: { increment: 1 } },
  });

  return {
    id: download.id,
    fileAssetId: download.fileAssetId,
    userId: download.userId,
    ipAddress: download.ipAddress,
    downloadMethod: download.downloadMethod,
    createdAt: download.createdAt.toISOString(),
  };
}

// ===== Signed URLs =====

/** Generate a signed download URL for a file. */
export async function createSignedUrl(
  fileAssetId: string,
  userId: string,
  opts: { expiresInHours?: number; downloadLimit?: number; ipAddress?: string } = {},
): Promise<SignedUrlDTO> {
  const file = await db.fileAsset.findUnique({ where: { id: fileAssetId } });
  if (!file || file.deletedAt) {
    throw new FileNotFoundError(fileAssetId);
  }

  if (!file.isPublic) {
    await requireMembership(file.workspaceId, userId);
  }

  const expiresInHours = opts.expiresInHours ?? SIGNED_URL_DEFAULT_EXPIRY_HOURS;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const token = crypto.randomBytes(32).toString('hex');

  await db.signedUrlToken.create({
    data: {
      fileAssetId,
      token,
      createdBy: userId,
      expiresAt,
      downloadLimit: opts.downloadLimit ?? 0,
      ipAddress: opts.ipAddress ?? null,
    },
  });

  // Log the signed URL creation
  await db.fileAccessLog.create({
    data: {
      fileAssetId,
      userId,
      action: 'signed_url_create',
      success: true,
    },
  }).catch(() => {});

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000';

  return {
    token,
    url: `${baseUrl}/api/files/${fileAssetId}/download?token=${token}`,
    fileAssetId,
    filename: file.filename,
    expiresAt: expiresAt.toISOString(),
    downloadLimit: opts.downloadLimit ?? 0,
    downloadCount: 0,
  };
}

/** Verify a signed URL token + return the file asset. */
export async function verifySignedUrl(
  token: string,
  opts: { ipAddress?: string } = {},
): Promise<{ fileAsset: FileAssetDTO; tokenRecord: { id: string; downloadLimit: number; downloadCount: number } }> {
  const tokenRecord = await db.signedUrlToken.findUnique({
    where: { token },
    include: { fileAsset: true },
  });

  if (!tokenRecord) {
    throw new FileError('SIGNED_URL_INVALID', 'Invalid download token.', 401);
  }

  if (tokenRecord.isRevoked) {
    throw new SignedUrlRevokedError();
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new SignedUrlExpiredError();
  }

  // Check download limit
  if (tokenRecord.downloadLimit > 0 && tokenRecord.downloadCount >= tokenRecord.downloadLimit) {
    throw new DownloadLimitExceededError(tokenRecord.downloadLimit);
  }

  // Check IP restriction
  if (tokenRecord.ipAddress && opts.ipAddress && tokenRecord.ipAddress !== opts.ipAddress) {
    throw new FileError('SIGNED_URL_IP_MISMATCH', 'This link is restricted to a specific IP address.', 403);
  }

  if (!tokenRecord.fileAsset || tokenRecord.fileAsset.deletedAt) {
    throw new FileNotFoundError(tokenRecord.fileAssetId);
  }

  // Increment download count on the token
  await db.signedUrlToken.update({
    where: { id: tokenRecord.id },
    data: { downloadCount: { increment: 1 } },
  });

  return {
    fileAsset: toDTO(tokenRecord.fileAsset),
    tokenRecord: {
      id: tokenRecord.id,
      downloadLimit: tokenRecord.downloadLimit,
      downloadCount: tokenRecord.downloadCount + 1,
    },
  };
}

/** Revoke a signed URL. */
export async function revokeSignedUrl(token: string, userId: string): Promise<void> {
  const tokenRecord = await db.signedUrlToken.findUnique({
    where: { token },
    include: { fileAsset: { select: { workspaceId: true } } },
  });

  if (!tokenRecord) {
    throw new FileError('SIGNED_URL_INVALID', 'Invalid download token.', 404);
  }

  // Verify workspace access
  if (tokenRecord.fileAsset) {
    await requireMembership(tokenRecord.fileAsset.workspaceId, userId);
  }

  await db.signedUrlToken.update({
    where: { id: tokenRecord.id },
    data: { isRevoked: true, revokedAt: new Date() },
  });
}

// ===== Cleanup =====

/** Delete files that have been soft-deleted for more than the grace period. */
export async function cleanupDeletedFiles(gracePeriodDays = 7): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - gracePeriodDays * 24 * 60 * 60 * 1000);
  const files = await db.fileAsset.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true, storageKey: true, storageProvider: true },
  });

  const storage = getStorageProvider();
  let deleted = 0;

  for (const file of files) {
    try {
      // Delete from storage
      const provider = getStorageProviderBySlug(file.storageProvider as never);
      await provider.delete(file.storageKey);
      // Hard-delete from DB
      await db.fileAsset.delete({ where: { id: file.id } });
      deleted++;
    } catch (err) {
      console.error(`[files] cleanup: failed to delete ${file.id}:`, err);
    }
  }

  return { deleted };
}

/** Delete expired temporary files. */
export async function cleanupExpiredFiles(): Promise<{ deleted: number }> {
  const now = new Date();
  const files = await db.fileAsset.findMany({
    where: {
      expiresAt: { lt: now },
      deletedAt: null,
    },
    select: { id: true, storageKey: true, storageProvider: true },
  });

  let deleted = 0;
  for (const file of files) {
    try {
      await db.fileAsset.update({
        where: { id: file.id },
        data: { deletedAt: now },
      });
      deleted++;
    } catch {
      // best-effort
    }
  }

  return { deleted };
}

/** Delete expired signed URL tokens. */
export async function cleanupExpiredSignedUrls(): Promise<{ deleted: number }> {
  const result = await db.signedUrlToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return { deleted: result.count };
}

