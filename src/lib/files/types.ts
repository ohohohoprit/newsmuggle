/**
 * Files shared types — used across the file storage service, export
 * service, and API routes.
 */

// ===== Storage providers =====

export type StorageProviderSlug = 'local' | 's3' | 'r2' | 'gcs';

export const ALL_STORAGE_PROVIDERS: StorageProviderSlug[] = ['local', 's3', 'r2', 'gcs'];

// ===== File categories =====

export type FileCategory = 'upload' | 'export' | 'generated' | 'studio';

export const ALL_FILE_CATEGORIES: FileCategory[] = ['upload', 'export', 'generated', 'studio'];

// ===== Source types =====

export type FileSourceType = 'tool_execution' | 'studio_content' | 'manual_upload' | 'export';

export const ALL_SOURCE_TYPES: FileSourceType[] = ['tool_execution', 'studio_content', 'manual_upload', 'export'];

// ===== DTOs =====

export interface FileAssetDTO {
  id: string;
  workspaceId: string;
  uploadedById: string;
  filename: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
  storageProvider: StorageProviderSlug;
  category: FileCategory;
  sourceType: FileSourceType | null;
  sourceId: string | null;
  description: string | null;
  tags: string[];
  isPublic: boolean;
  downloadCount: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl: string | null; // signed URL if available
}

export interface ExportJobDTO {
  id: string;
  workspaceId: string;
  userId: string;
  format: ExportFormat;
  sourceType: string;
  sourceId: string | null;
  title: string;
  description: string | null;
  status: ExportJobStatus;
  fileAssetId: string | null;
  templateId: string | null;
  errorMessage: string | null;
  attemptCount: number;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ExportFormat = 'pdf' | 'docx' | 'md' | 'zip' | 'json' | 'csv';

export const ALL_EXPORT_FORMATS: ExportFormat[] = ['pdf', 'docx', 'md', 'zip', 'json', 'csv'];

export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface SignedUrlDTO {
  token: string;
  url: string;
  fileAssetId: string;
  filename: string;
  expiresAt: string;
  downloadLimit: number;
  downloadCount: number;
}

export interface FileDownloadDTO {
  id: string;
  fileAssetId: string;
  userId: string | null;
  ipAddress: string | null;
  downloadMethod: string;
  createdAt: string;
}

// ===== Upload input =====

export interface UploadFileInput {
  workspaceId: string;
  uploadedById: string;
  filename: string;
  mimeType: string;
  data: Buffer;
  category?: FileCategory;
  sourceType?: FileSourceType;
  sourceId?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  expiresAt?: Date;
}

// ===== Export input =====

export interface CreateExportInput {
  workspaceId: string;
  userId: string;
  format: ExportFormat;
  sourceType: 'tool_execution' | 'studio_content' | 'manual' | 'template';
  sourceId?: string;
  title: string;
  description?: string;
  content?: string; // raw content to export (for manual exports)
  templateId?: string;
  options?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface ExportResult {
  jobId: string;
  status: ExportJobStatus;
  fileAssetId: string | null;
  filename: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  durationMs: number;
}
