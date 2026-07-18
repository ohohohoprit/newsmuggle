import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { runJobByType } from '@/lib/jobs/definitions';
import type { JobType } from '@/lib/jobs/types';
import { ALL_JOB_TYPES } from '@/lib/jobs/types';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/jobs/run
 * Run a specific job by type. Admin only.
 *
 * Body:
 *   - jobType: string   (required: quota_reset|usage_snapshot|threshold_check|stale_check|studio_sync|notification_cleanup|retry_failed)
 *   - force?: boolean   (default: false — if true, bypasses daily dedup)
 *
 * Returns the job result.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const jobTypeParam = typeof body.jobType === 'string' ? body.jobType : '';
  if (!jobTypeParam || !ALL_JOB_TYPES.includes(jobTypeParam as JobType)) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: `jobType must be one of: ${ALL_JOB_TYPES.join(', ')}.` },
      { status: 400 },
    );
  }

  const force = typeof body.force === 'boolean' ? body.force : false;
  const jobType = jobTypeParam as JobType;

  try {
    const result = await runJobByType(jobType, { force, triggeredBy: 'user', userId: auth.user!.id });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Job failed.';
    return NextResponse.json({ error: 'JOB_ERROR', message }, { status: 500 });
  }
}
