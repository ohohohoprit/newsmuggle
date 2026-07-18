import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { createExport } from '@/lib/exports/service';
import { FileError } from '@/lib/files/errors';
import type { ExportFormat } from '@/lib/files/types';

interface ExportRequestBody {
  sourceType?: 'tool_execution' | 'studio_content' | 'manual' | 'template';
  sourceId?: string;
  title?: string;
  description?: string;
  content?: string;
  templateId?: string;
  options?: Record<string, unknown>;
  workspaceId?: string;
  expiresInHours?: number;
}

/**
 * Shared handler for format-specific export routes (pdf, docx, md, zip).
 */
export async function handleExportRequest(
  req: Request,
  format: ExportFormat,
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: ExportRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    let workspaceId = body.workspaceId;
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

    const result = await createExport({
      workspaceId,
      userId: auth.user!.id,
      format,
      sourceType: body.sourceType ?? 'manual',
      ...(body.sourceId ? { sourceId: body.sourceId } : {}),
      title: body.title ?? `Export ${format.toUpperCase()}`,
      ...(body.description ? { description: body.description } : {}),
      ...(body.content ? { content: body.content } : {}),
      ...(body.templateId ? { templateId: body.templateId } : {}),
      ...(body.options ? { options: body.options } : {}),
      ...(body.expiresInHours ? { expiresAt: new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000) } : {}),
    }, req);

    return NextResponse.json(result, { status: result.status === 'failed' ? 500 : 201 });
  } catch (err) {
    if (err instanceof FileError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Export failed.';
    return NextResponse.json({ error: 'EXPORT_ERROR', message }, { status: 500 });
  }
}
