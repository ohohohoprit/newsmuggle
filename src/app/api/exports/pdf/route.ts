import { handleExportRequest } from '@/app/api/exports/_handler';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/exports/pdf
 * Export content as PDF.
 *
 * Body:
 *   - sourceType: 'tool_execution' | 'studio_content' | 'manual' (default: manual)
 *   - sourceId?: string (required if sourceType is tool_execution or studio_content)
 *   - title?: string
 *   - content?: string (required if sourceType is manual)
 *   - options?: { pageSize?, orientation?, includeMetadata? }
 *   - workspaceId?: string
 *   - expiresInHours?: number
 */
export async function POST(req: Request) {
  return handleExportRequest(req, 'pdf');
}
