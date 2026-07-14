import { handleExportRequest } from '@/app/api/exports/_handler';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/** POST /api/exports/md — Export content as Markdown. */
export async function POST(req: Request) {
  return handleExportRequest(req, 'md');
}
