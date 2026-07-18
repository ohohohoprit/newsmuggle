import { NextResponse } from 'next/server';
import { runJobByType } from '@/lib/jobs/definitions';
import type { JobType } from '@/lib/jobs/types';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/cron
 * Internal cron endpoint — runs scheduled jobs.
 * 
 * Protected by a simple secret header (CRON_SECRET env var).
 * If CRON_SECRET is not set, the endpoint is closed (503) — fail-closed.
 * 
 * This endpoint is designed to be called by:
 *   - Vercel Cron (vercel.json crons config)
 *   - cron-job.org (external cron service)
 *   - A local setInterval (dev mode)
 *   - Any HTTP cron trigger
 * 
 * Query params:
 *   - job: the job type to run (optional — if omitted, runs all scheduled jobs)
 * 
 * Headers:
 *   - Authorization: Bearer <CRON_SECRET>  (required)
 *
 * Fail-closed: if CRON_SECRET is not configured, the endpoint returns 503.
 */

/**
 * Returns null when the request is authorized, otherwise a NextResponse
 * describing the failure (503 when unconfigured, 401 on secret mismatch).
 */
function authorizeCron(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request) {
  const authError = authorizeCron(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const jobParam = url.searchParams.get('job');

  // If a specific job is requested, run just that one
  if (jobParam) {
    try {
      const result = await runJobByType(jobParam as JobType, { triggeredBy: 'cron' });
      return NextResponse.json({ job: jobParam, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Job failed';
      return NextResponse.json({ job: jobParam, error: message }, { status: 500 });
    }
  }

  // Otherwise, run the full schedule based on current time
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const dayOfMonth = now.getUTCDate();

  const results: Record<string, unknown> = {};

  // Every call: retry failed notification deliveries
  try {
    results.retry_failed = await runJobByType('retry_failed', { triggeredBy: 'cron' });
  } catch (err) {
    results.retry_failed = { error: err instanceof Error ? err.message : 'failed' };
  }

  // Every call: check usage thresholds
  try {
    results.threshold_check = await runJobByType('threshold_check', { triggeredBy: 'cron' });
  } catch (err) {
    results.threshold_check = { error: err instanceof Error ? err.message : 'failed' };
  }

  // Every 6 hours (0, 6, 12, 18 UTC): check for stale studio accounts
  if (hour % 6 === 0 && minute < 15) {
    try {
      results.stale_check = await runJobByType('stale_check', { triggeredBy: 'cron' });
    } catch (err) {
      results.stale_check = { error: err instanceof Error ? err.message : 'failed' };
    }

    try {
      results.studio_sync = await runJobByType('studio_sync', { triggeredBy: 'cron' });
    } catch (err) {
      results.studio_sync = { error: err instanceof Error ? err.message : 'failed' };
    }
  }

  // Once daily at 00:xx UTC: cleanup old notifications + usage snapshot
  if (hour === 0 && minute < 15) {
    try {
      results.notification_cleanup = await runJobByType('notification_cleanup', { triggeredBy: 'cron' });
    } catch (err) {
      results.notification_cleanup = { error: err instanceof Error ? err.message : 'failed' };
    }

    try {
      results.usage_snapshot = await runJobByType('usage_snapshot', { triggeredBy: 'cron' });
    } catch (err) {
      results.usage_snapshot = { error: err instanceof Error ? err.message : 'failed' };
    }
  }

  // First of the month at 00:xx UTC: reset quotas
  if (dayOfMonth === 1 && hour === 0 && minute < 15) {
    try {
      results.quota_reset = await runJobByType('quota_reset', { triggeredBy: 'cron' });
    } catch (err) {
      results.quota_reset = { error: err instanceof Error ? err.message : 'failed' };
    }
  }

  return NextResponse.json({ ran: Object.keys(results).length, results });
}

/**
 * GET /api/cron — health check for the cron system.
 * Requires the same CRON_SECRET authorization as POST.
 */
export async function GET(req: Request) {
  const authError = authorizeCron(req);
  if (authError) return authError;

  return NextResponse.json({
    ok: true,
    endpoint: '/api/cron',
    method: 'POST',
    description: 'Call POST with ?job=<jobType> to run a specific job, or POST without params to run scheduled jobs.',
    availableJobs: ['quota_reset', 'usage_snapshot', 'threshold_check', 'stale_check', 'studio_sync', 'notification_cleanup', 'retry_failed'],
    schedule: {
      every_call: ['retry_failed', 'threshold_check'],
      every_6h: ['stale_check', 'studio_sync'],
      daily: ['notification_cleanup', 'usage_snapshot'],
      monthly: ['quota_reset'],
    },
  });
}
