import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { listJobRuns } from '@/lib/jobs/runner';
import { JOB_SCHEDULES } from '@/lib/jobs/types';
import type { JobType, JobStatus } from '@/lib/jobs/types';
import { ALL_JOB_TYPES } from '@/lib/jobs/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/jobs
 * List job run history + show available job schedules.
 *
 * Query params:
 *   - jobType=<type>   (optional)
 *   - status=<status>  (optional: running|completed|failed|partial)
 *   - limit=<n>        (default 20, max 100)
 *   - offset=<n>       (default 0)
 *
 * Admin only.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  const url = new URL(req.url);
  const jobTypeParam = url.searchParams.get('jobType');
  const statusParam = url.searchParams.get('status');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 100);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;

  const jobType = jobTypeParam && ALL_JOB_TYPES.includes(jobTypeParam as JobType) ? jobTypeParam as JobType : undefined;
  const status = statusParam && ['running', 'completed', 'failed', 'partial'].includes(statusParam) ? statusParam as JobStatus : undefined;

  const result = await listJobRuns({ ...(jobType ? { jobType } : {}), ...(status ? { status } : {}), limit, offset });

  return NextResponse.json({
    ...result,
    schedules: JOB_SCHEDULES,
    availableJobs: ALL_JOB_TYPES,
  });
}
