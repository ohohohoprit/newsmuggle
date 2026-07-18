import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { getJobRun } from '@/lib/jobs/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/jobs/:id
 * Get details of a specific job run.
 *
 * Admin only.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await ctx.params;
  const jobRun = await getJobRun(id);

  if (!jobRun) {
    return NextResponse.json(
      { error: 'JOB_NOT_FOUND', message: `Job run "${id}" not found.` },
      { status: 404 },
    );
  }

  return NextResponse.json({ jobRun });
}
