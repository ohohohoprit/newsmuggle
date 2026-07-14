/**
 * Export service — creates, processes, and tracks export jobs.
 *
 * Flow:
 *   1. Create an ExportJob (status=pending)
 *   2. Check billing entitlements (creator+ plan required)
 *   3. Resolve the source content (tool execution, studio content, or manual)
 *   4. Generate the file via the appropriate generator
 *   5. Save to storage as a FileAsset
 *   6. Update ExportJob (status=completed, fileAssetId set)
 *   7. On failure, log to ExportFailureLog + retry (up to maxAttempts)
 *
 * Supports:
 *   - PDF, DOCX, Markdown, ZIP, JSON, CSV formats
 *   - Export from tool execution output
 *   - Export from studio content items
 *   - Export from manual content
 *   - Export using templates (future)
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/auth';
import { requireMembership } from '@/lib/workspace';
import { saveFile } from '@/lib/files/service';
import { requireExportAccess, canCreateExport } from '@/lib/files/entitlements';
import { FileError, FileValidationError } from '@/lib/files/errors';
import type { CreateExportInput, ExportResult, ExportJobDTO, ExportFormat } from '@/lib/files/types';
import {
  generateMarkdown,
  generatePdf,
  generateDocx,
  generateZip,
  generateJson,
  generateCsv,
  type ExportContent,
} from '@/lib/exports/generators';

// ===== Helpers =====

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toDTO(j: {
  id: string;
  workspaceId: string;
  userId: string;
  format: string;
  sourceType: string;
  sourceId: string | null;
  title: string;
  description: string | null;
  status: string;
  fileAssetId: string | null;
  templateId: string | null;
  errorMessage: string | null;
  attemptCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ExportJobDTO {
  return {
    id: j.id,
    workspaceId: j.workspaceId,
    userId: j.userId,
    format: j.format as ExportFormat,
    sourceType: j.sourceType,
    sourceId: j.sourceId,
    title: j.title,
    description: j.description,
    status: j.status as ExportJobDTO['status'],
    fileAssetId: j.fileAssetId,
    templateId: j.templateId,
    errorMessage: j.errorMessage,
    attemptCount: j.attemptCount,
    startedAt: j.startedAt?.toISOString() ?? null,
    completedAt: j.completedAt?.toISOString() ?? null,
    expiresAt: j.expiresAt?.toISOString() ?? null,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  };
}

function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'md': return 'text/markdown';
    case 'zip': return 'application/zip';
    case 'json': return 'application/json';
    case 'csv': return 'text/csv';
    default: return 'application/octet-stream';
  }
}

function getExtension(format: ExportFormat): string {
  switch (format) {
    case 'pdf': return '.pdf';
    case 'docx': return '.docx';
    case 'md': return '.md';
    case 'zip': return '.zip';
    case 'json': return '.json';
    case 'csv': return '.csv';
    default: return '.txt';
  }
}

// ===== Source content resolution =====

async function resolveToolExecutionContent(executionId: string, workspaceId: string): Promise<ExportContent> {
  const execution = await db.toolExecution.findUnique({
    where: { id: executionId },
    include: { tool: { select: { name: true, slug: true } } },
  });
  if (!execution) {
    throw new FileValidationError('Tool execution not found.', { executionId });
  }
  if (execution.workspaceId !== workspaceId) {
    throw new FileError('FILE_ACCESS_DENIED', 'Tool execution does not belong to this workspace.', 403);
  }

  const output = safeParseJson<{
    items?: Array<{ text: string; score?: number; rationale?: string }>;
    text?: string;
    summary?: string;
  }>(execution.output, {});

  return {
    title: `${execution.tool.name} — Export`,
    body: output.summary ?? execution.summary ?? '',
    items: output.items,
    metadata: {
      toolSlug: execution.tool.slug,
      toolName: execution.tool.name,
      executionId: execution.id,
      status: execution.status,
      createdAt: execution.createdAt.toISOString(),
      provider: execution.provider,
      model: execution.model,
      tokensUsed: execution.totalTokens,
    },
  };
}

async function resolveStudioContentContent(contentItemId: string, workspaceId: string): Promise<ExportContent> {
  const item = await db.socialContentItem.findUnique({
    where: { id: contentItemId },
    include: { connectedAccount: { select: { provider: true, displayName: true } } },
  });
  if (!item) {
    throw new FileValidationError('Studio content item not found.', { contentItemId });
  }

  // Verify workspace access via connected account
  const account = await db.connectedAccount.findUnique({
    where: { id: item.connectedAccountId },
    select: { workspaceId: true },
  });
  if (!account || account.workspaceId !== workspaceId) {
    throw new FileError('FILE_ACCESS_DENIED', 'Content item does not belong to this workspace.', 403);
  }

  return {
    title: item.title ?? 'Untitled Content',
    body: item.description ?? '',
    items: [{
      text: item.title ?? '',
      score: item.engagementRate > 0 ? Math.round(item.engagementRate) : undefined,
      rationale: `Views: ${item.viewCount}, Likes: ${item.likeCount}, Comments: ${item.commentCount}`,
    }],
    metadata: {
      type: item.type,
      provider: item.connectedAccount.provider,
      accountName: item.connectedAccount.displayName,
      publishedAt: item.publishedAt.toISOString(),
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      shareCount: item.shareCount,
      engagementRate: item.engagementRate,
    },
  };
}

// ===== Public API =====

/**
 * Create + process an export job.
 */
export async function createExport(input: CreateExportInput, req?: Request): Promise<ExportResult> {
  const startTime = Date.now();

  // 1. Verify workspace access
  await requireMembership(input.workspaceId, input.userId);

  // 2. Check billing entitlements
  await requireExportAccess(input.workspaceId);
  const canExport = await canCreateExport(input.workspaceId);
  if (!canExport.allowed) {
    throw new FileError('EXPORT_LIMIT_REACHED', canExport.reason ?? 'Export limit reached.', 429, {
      usedExports: canExport.usedExports,
      maxExports: canExport.maxExports,
    });
  }

  // 3. Create the export job
  const job = await db.exportJob.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      format: input.format,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      title: input.title,
      description: input.description ?? null,
      status: 'processing',
      startedAt: new Date(),
      options: input.options ? JSON.stringify(input.options) : null,
      expiresAt: input.expiresAt ?? null,
      templateId: input.templateId ?? null,
    },
  });

  try {
    // 4. Resolve source content
    let content: ExportContent;
    if (input.sourceType === 'tool_execution' && input.sourceId) {
      content = await resolveToolExecutionContent(input.sourceId, input.workspaceId);
    } else if (input.sourceType === 'studio_content' && input.sourceId) {
      content = await resolveStudioContentContent(input.sourceId, input.workspaceId);
    } else if (input.sourceType === 'manual' && input.content) {
      content = {
        title: input.title,
        body: input.content,
        metadata: input.options,
      };
    } else {
      throw new FileValidationError('Invalid source: provide content (manual) or a valid sourceId (tool_execution/studio_content).', {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      });
    }

    // 5. Generate the file
    const opts = { includeMetadata: true, ...input.options };
    let fileBuffer: Buffer;
    let filename: string;

    const safeTitle = input.title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
    const ext = getExtension(input.format);
    filename = `${safeTitle}${ext}`;

    switch (input.format) {
      case 'md':
        fileBuffer = await generateMarkdown(content, opts);
        break;
      case 'pdf':
        fileBuffer = await generatePdf(content, opts);
        break;
      case 'docx':
        fileBuffer = await generateDocx(content, opts);
        break;
      case 'json':
        fileBuffer = await generateJson({ content, metadata: content.metadata }, opts);
        break;
      case 'csv':
        fileBuffer = await generateCsv(content.items ?? [], opts);
        break;
      case 'zip':
        // For ZIP, bundle the content as multiple formats
        const mdBuffer = await generateMarkdown(content, opts);
        const jsonBuffer = await generateJson({ content, metadata: content.metadata }, opts);
        fileBuffer = await generateZip([
          { filename: `${safeTitle}.md`, content: mdBuffer },
          { filename: `${safeTitle}.json`, content: jsonBuffer },
        ], opts);
        break;
      default:
        throw new FileValidationError(`Unsupported export format: ${input.format}`, { format: input.format });
    }

    // 6. Save to storage as a FileAsset
    const fileAsset = await saveFile({
      workspaceId: input.workspaceId,
      uploadedById: input.userId,
      filename,
      mimeType: getMimeType(input.format),
      data: fileBuffer,
      category: 'export',
      sourceType: 'export',
      sourceId: job.id,
      description: input.description,
      tags: [input.format, input.sourceType],
      expiresAt: input.expiresAt,
    });

    // 7. Update job as completed
    const completedAt = new Date();
    await db.exportJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        fileAssetId: fileAsset.id,
        completedAt,
      },
    });

    if (req) {
      await auditLog('export_create', input.userId, req, 'success', {
        workspaceId: input.workspaceId,
        exportJobId: job.id,
        format: input.format,
        sourceType: input.sourceType,
        fileAssetId: fileAsset.id,
      });
    }

    const durationMs = Date.now() - startTime;

    return {
      jobId: job.id,
      status: 'completed',
      fileAssetId: fileAsset.id,
      filename: fileAsset.filename,
      downloadUrl: `/api/files/${fileAsset.id}/download`,
      errorMessage: null,
      durationMs,
    };
  } catch (err) {
    // Mark job as failed
    const errorMessage = err instanceof Error ? err.message : 'Export failed';
    await db.exportJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    // Log the failure
    await db.exportFailureLog.create({
      data: {
        exportJobId: job.id,
        errorType: err instanceof FileError ? 'generation_error' : 'internal_error',
        errorMessage,
        payload: JSON.stringify({ format: input.format, sourceType: input.sourceType }),
      },
    }).catch(() => {});

    if (req) {
      await auditLog('export_create', input.userId, req, 'failed', {
        workspaceId: input.workspaceId,
        exportJobId: job.id,
        format: input.format,
        error: errorMessage,
      });
    }

    const durationMs = Date.now() - startTime;

    return {
      jobId: job.id,
      status: 'failed',
      fileAssetId: null,
      filename: null,
      downloadUrl: null,
      errorMessage,
      durationMs,
    };
  }
}

/**
 * List export jobs for a workspace.
 */
export async function listExports(
  workspaceId: string,
  userId: string,
  opts: { status?: string; format?: string; limit?: number; offset?: number } = {},
): Promise<{ items: ExportJobDTO[]; total: number }> {
  await requireMembership(workspaceId, userId);
  const limit = Math.min(opts.limit ?? 20, 100);
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = { workspaceId };
  if (opts.status) where.status = opts.status;
  if (opts.format) where.format = opts.format;

  const [items, total] = await Promise.all([
    db.exportJob.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    db.exportJob.count({ where }),
  ]);

  return { items: items.map(toDTO), total };
}

/**
 * Get a single export job by ID.
 */
export async function getExport(id: string, userId: string): Promise<ExportJobDTO> {
  const job = await db.exportJob.findUnique({ where: { id } });
  if (!job) {
    throw new FileError('EXPORT_NOT_FOUND', `Export job "${id}" not found.`, 404);
  }
  await requireMembership(job.workspaceId, userId);
  return toDTO(job);
}

/**
 * Retry a failed export job.
 */
export async function retryExport(jobId: string, userId: string, req?: Request): Promise<ExportResult> {
  const job = await db.exportJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new FileError('EXPORT_NOT_FOUND', `Export job "${jobId}" not found.`, 404);
  }
  await requireMembership(job.workspaceId, userId);

  if (job.status !== 'failed') {
    throw new FileError('EXPORT_NOT_FAILED', 'Only failed export jobs can be retried.', 400);
  }
  if (job.attemptCount >= job.maxAttempts) {
    throw new FileError('EXPORT_MAX_ATTEMPTS', `Maximum retry attempts (${job.maxAttempts}) reached.`, 429);
  }

  // Re-create the export with the same params
  return createExport({
    workspaceId: job.workspaceId,
    userId,
    format: job.format as ExportFormat,
    sourceType: job.sourceType as CreateExportInput['sourceType'],
    sourceId: job.sourceId ?? undefined,
    title: job.title,
    description: job.description ?? undefined,
    options: job.options ? safeParseJson<Record<string, unknown>>(job.options, {}) : undefined,
    expiresAt: job.expiresAt ?? undefined,
  }, req);
}
