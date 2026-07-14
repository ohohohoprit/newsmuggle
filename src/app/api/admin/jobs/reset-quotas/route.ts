import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { runQuotaResetJob } from '@/lib/jobs/definitions';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/jobs/reset-quotas
 * Manually trigger the monthly quota reset job.
 *
 * Body (optional):
 *   - force: boolean  (default: false — bypass daily dedup)
 *
 * Admin only.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body
  }

  const force = typeof body.force === 'boolean' ? body.force : false;

  try {
    const result = await runQuotaResetJob({ force, triggeredBy: 'user', userId: auth.user!.id });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Job failed.';
    return NextResponse.json({ error: 'JOB_ERROR', message }, { status: 500 });
  }
}
