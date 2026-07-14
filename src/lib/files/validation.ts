/**
 * File validation — pure validators.
 */
import type { FileCategory, FileSourceType, StorageProviderSlug } from '@/lib/files/types';
import { ALL_FILE_CATEGORIES, ALL_SOURCE_TYPES } from '@/lib/files/types';
import { FileValidationError } from '@/lib/files/errors';

export function validateFilename(filename: unknown): string {
  if (typeof filename !== 'string' || !filename.trim()) {
    throw new FileValidationError('Filename is required.');
  }
  const trimmed = filename.trim();
  if (trimmed.length > 255) {
    throw new FileValidationError('Filename must be 255 characters or fewer.');
  }
  // Prevent path traversal
  if (/\.\./.test(trimmed) || /[\/\\]/.test(trimmed)) {
    throw new FileValidationError('Filename must not contain path separators or "..".');
  }
  return trimmed;
}

export function validateMimeType(mimeType: unknown): string {
  if (typeof mimeType !== 'string' || !mimeType.trim()) {
    return 'application/octet-stream';
  }
  return mimeType.trim().slice(0, 100);
}

export function validateFileCategory(category: unknown): FileCategory {
  if (category === undefined || category === null) return 'upload';
  if (typeof category !== 'string') {
    throw new FileValidationError('Category must be a string.');
  }
  const trimmed = category.trim().toLowerCase() as FileCategory;
  if (!ALL_FILE_CATEGORIES.includes(trimmed)) {
    throw new FileValidationError(`Category must be one of: ${ALL_FILE_CATEGORIES.join(', ')}.`);
  }
  return trimmed;
}

export function validateSourceType(sourceType: unknown): FileSourceType | undefined {
  if (sourceType === undefined || sourceType === null) return undefined;
  if (typeof sourceType !== 'string') return undefined;
  const trimmed = sourceType.trim().toLowerCase() as FileSourceType;
  if (!ALL_SOURCE_TYPES.includes(trimmed)) return undefined;
  return trimmed;
}

export function validateFileSize(sizeBytes: number): void {
  const maxSize = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES ?? '52428800', 10); // 50MB default
  if (sizeBytes > maxSize) {
    throw new FileValidationError(`File size exceeds the maximum allowed (${maxSize} bytes).`, { sizeBytes, maxSize });
  }
}

export function validateLimit(raw: unknown, def = 50, max = 200): number {
  if (raw === undefined || raw === null) return def;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(max, Math.floor(n));
}

export function validateOffset(raw: unknown): number {
  if (raw === undefined || raw === null) return 0;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function validateTags(tags: unknown): string[] {
  if (tags === undefined || tags === null) return [];
  if (!Array.isArray(tags)) {
    throw new FileValidationError('Tags must be an array of strings.');
  }
  return tags
    .map((t) => (typeof t === 'string' ? t.trim().toLowerCase() : ''))
    .filter((t) => t.length > 0 && t.length <= 40)
    .slice(0, 20);
}

export function validateDescription(description: unknown): string | undefined {
  if (description === undefined || description === null) return undefined;
  if (typeof description !== 'string') return undefined;
  const trimmed = description.trim();
  if (trimmed.length > 1000) {
    throw new FileValidationError('Description must be 1000 characters or fewer.');
  }
  return trimmed || undefined;
}

export function validateExpiryHours(hours: unknown): Date | undefined {
  if (hours === undefined || hours === null) return undefined;
  const n = typeof hours === 'number' ? hours : parseInt(String(hours), 10);
  if (!Number.isFinite(n) || n < 1 || n > 720) return undefined; // max 30 days
  return new Date(Date.now() + n * 60 * 60 * 1000);
}
