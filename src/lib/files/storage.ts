/**
 * Storage abstraction — pluggable storage providers.
 *
 * Providers:
 *   - LocalStorageProvider: writes to local disk (default, dev)
 *   - S3StorageProvider: stub for AWS S3 / Cloudflare R2 / GCS (production)
 *
 * Provider selection: STORAGE_PROVIDER env var (default: local)
 *
 * Switching to S3 later:
 *   1. Set STORAGE_PROVIDER=s3
 *   2. Set S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_REGION, S3_ENDPOINT (for R2)
 *   3. No code changes needed — the storage interface is identical
 */
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { StorageProviderSlug } from '@/lib/files/types';
import { StorageError, StorageNotConfiguredError } from '@/lib/files/errors';

// ===== Storage provider interface =====

export interface StorageProvider {
  readonly slug: StorageProviderSlug;
  isConfigured(): boolean;
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string, expiresIn?: number): Promise<string>;
  getSize(key: string): Promise<number>;
}

// ===== Local storage provider =====

export class LocalStorageProvider implements StorageProvider {
  readonly slug: StorageProviderSlug = 'local';

  private get basePath(): string {
    return process.env.LOCAL_STORAGE_PATH ?? path.join(process.cwd(), 'storage');
  }

  isConfigured(): boolean {
    return true; // always available
  }

  private getFullPath(key: string): string {
    // Prevent path traversal
    const safe = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.basePath, safe);
  }

  async save(key: string, data: Buffer): Promise<void> {
    try {
      const fullPath = this.getFullPath(key);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, data);
    } catch (err) {
      throw new StorageError(`Failed to save file: ${err instanceof Error ? err.message : 'unknown'}`, { key });
    }
  }

  async read(key: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.getFullPath(key));
    } catch (err) {
      throw new StorageError(`Failed to read file: ${err instanceof Error ? err.message : 'unknown'}`, { key });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.getFullPath(key));
    } catch (err) {
      // File may already be deleted — that's OK
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new StorageError(`Failed to delete file: ${err instanceof Error ? err.message : 'unknown'}`, { key });
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.getFullPath(key));
      return true;
    } catch {
      return false;
    }
  }

  async getUrl(key: string, _expiresIn?: number): Promise<string> {
    // For local storage, return a relative API path (signed URLs handled by the file service)
    return `/api/files/download/${key}`;
  }

  async getSize(key: string): Promise<number> {
    try {
      const stat = await fs.stat(this.getFullPath(key));
      return stat.size;
    } catch {
      return 0;
    }
  }
}

// ===== S3-compatible storage provider (stub) =====
// Supports AWS S3, Cloudflare R2, Google Cloud Storage, MinIO, etc.

export class S3StorageProvider implements StorageProvider {
  readonly slug: StorageProviderSlug = 's3';

  isConfigured(): boolean {
    return !!(process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY && process.env.S3_BUCKET);
  }

  private requireConfigured(): void {
    if (!this.isConfigured()) {
      throw new StorageNotConfiguredError('s3');
    }
  }

  private get endpoint(): string | undefined {
    return process.env.S3_ENDPOINT; // for R2/MinIO; undefined for AWS S3
  }

  private get bucket(): string {
    return process.env.S3_BUCKET ?? '';
  }

  private get region(): string {
    return process.env.S3_REGION ?? 'us-east-1';
  }

  async save(key: string, data: Buffer): Promise<void> {
    this.requireConfigured();
    // TODO: Implement with @aws-sdk/client-s3 when S3 is needed
    // For now, this is a stub that throws
    throw new StorageError('S3 storage not yet implemented. Install @aws-sdk/client-s3 and wire save().', { key });
  }

  async read(key: string): Promise<Buffer> {
    this.requireConfigured();
    throw new StorageError('S3 storage not yet implemented. Install @aws-sdk/client-s3 and wire read().', { key });
  }

  async delete(key: string): Promise<void> {
    this.requireConfigured();
    throw new StorageError('S3 storage not yet implemented. Install @aws-sdk/client-s3 and wire delete().', { key });
  }

  async exists(key: string): Promise<boolean> {
    this.requireConfigured();
    throw new StorageError('S3 storage not yet implemented.', { key });
  }

  async getUrl(key: string, expiresIn = 3600): Promise<string> {
    this.requireConfigured();
    // TODO: Generate presigned URL with @aws-sdk/s3-request-presigner
    throw new StorageError('S3 storage not yet implemented. Install @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner.', { key, expiresIn });
  }

  async getSize(key: string): Promise<number> {
    this.requireConfigured();
    throw new StorageError('S3 storage not yet implemented.', { key });
  }
}

// ===== Provider registry =====

const localStorageProvider = new LocalStorageProvider();
const s3StorageProvider = new S3StorageProvider();

const providerMap = new Map<StorageProviderSlug, StorageProvider>([
  ['local', localStorageProvider],
  ['s3', s3StorageProvider],
  ['r2', s3StorageProvider], // R2 uses S3-compatible API
  ['gcs', s3StorageProvider], // GCS via S3-compatible API
]);

/** Get the configured storage provider. */
export function getStorageProvider(): StorageProvider {
  const configured = (process.env.STORAGE_PROVIDER ?? 'local').trim().toLowerCase() as StorageProviderSlug;
  const provider = providerMap.get(configured) ?? localStorageProvider;
  return provider;
}

/** Get a specific provider by slug. */
export function getStorageProviderBySlug(slug: StorageProviderSlug): StorageProvider {
  return providerMap.get(slug) ?? localStorageProvider;
}

/** List all storage providers with their availability. */
export function listStorageProviders(): Array<{
  slug: StorageProviderSlug;
  configured: boolean;
  isDefault: boolean;
}> {
  const defaultSlug = (process.env.STORAGE_PROVIDER ?? 'local').trim().toLowerCase() as StorageProviderSlug;
  return Array.from(providerMap.entries()).map(([slug, provider]) => ({
    slug,
    configured: provider.isConfigured(),
    isDefault: slug === defaultSlug,
  }));
}

// ===== Storage key generation =====

/** Generate a unique storage key for a file. */
export function generateStorageKey(workspaceId: string, filename: string, extension?: string): string {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const random = crypto.randomBytes(8).toString('hex');
  const ext = extension ?? path.extname(filename);
  const base = path.basename(filename, path.extname(filename)).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
  return `${workspaceId}/${year}/${month}/${day}/${base}-${random}${ext}`;
}
