import { handleExportRequest } from '@/app/api/exports/_handler';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** POST /api/exports/zip — Export content as ZIP (bundles MD + JSON). */
export async function POST(req: Request) {
  return handleExportRequest(req, 'zip');
}
