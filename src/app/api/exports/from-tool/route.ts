import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { createExport } from '@/lib/exports/service';
import { FileError, FileValidationError } from '@/lib/files/errors';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/exports/from-tool
 * Export a tool execution's output in a specified format.
 *
 * Body:
 *   - executionId: string (required — the ToolExecution ID)
 *   - format: 'pdf' | 'docx' | 'md' | 'zip' | 'json' (default: pdf)
 *   - title?: string
 *   - options?: object
 *   - workspaceId?: string
 *   - expiresInHours?: number
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const executionId = typeof body.executionId === 'string' ? body.executionId : '';
    if (!executionId) {
      throw new FileValidationError('executionId is required.');
    }

    const format = (typeof body.format === 'string' ? body.format : 'pdf') as 'pdf' | 'docx' | 'md' | 'zip' | 'json';
    let workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : undefined;

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
      sourceType: 'tool_execution',
      sourceId: executionId,
      title: typeof body.title === 'string' ? body.title : 'Tool Execution Export',
      ...(body.options ? { options: body.options as Record<string, unknown> } : {}),
      ...(typeof body.expiresInHours === 'number' ? { expiresAt: new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000) } : {}),
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
