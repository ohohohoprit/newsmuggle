/**
 * Job runner — idempotent execution of scheduled jobs.
 *
 * Every job run is recorded in JobRun with status + result.
 * Cursor tracking via JobCursor prevents duplicate runs:
 *   - lastRunDate (YYYY-MM-DD) for daily dedup
 *   - lastCursor for incremental processing (e.g. last workspaceId)
 *
 * Failure handling:
 *   - Jobs that throw are marked as 'failed' + logged in JobFailureLog
 *   - Partial failures (some items processed, some failed) → 'partial'
 *   - The retry_failed job retries failed JobFailureLog entries
 *
 * The runner NEVER contains business logic — it calls service methods
 * from billing/quota, studio/sync, notifications/service, etc.
 */
import { db } from '@/lib/db';
import type { JobType, JobStatus, JobResult, JobRunDTO } from '@/lib/jobs/types';

// ===== Helpers =====

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ===== Cursor management =====

/**
 * Get the cursor for a job type (last run info).
 */
export async function getJobCursor(jobType: JobType): Promise<{
  lastRunAt: Date | null;
  lastRunDate: string | null;
  lastCursor: Record<string, unknown> | null;
  runCount: number;
}> {
  const cursor = await db.jobCursor.findUnique({ where: { jobType } });
  if (!cursor) {
    return { lastRunAt: null, lastRunDate: null, lastCursor: null, runCount: 0 };
  }
  return {
    lastRunAt: cursor.lastRunAt,
    lastRunDate: cursor.lastRunDate,
    lastCursor: safeParseJson<Record<string, unknown> | null>(cursor.lastCursor, null),
    runCount: cursor.runCount,
  };
}

/**
 * Check if a job has already run today (for daily dedup).
 */
export async function hasRunToday(jobType: JobType): Promise<boolean> {
  const cursor = await getJobCursor(jobType);
  const today = getDateString();
  return cursor.lastRunDate === today;
}

/**
 * Update the cursor after a job run.
 */
export async function updateJobCursor(
  jobType: JobType,
  cursor?: Record<string, unknown>,
): Promise<void> {
  const now = new Date();
  await db.jobCursor.upsert({
    where: { jobType },
    update: {
      lastRunAt: now,
      lastRunDate: getDateString(now),
      lastCursor: cursor ? JSON.stringify(cursor) : undefined,
      runCount: { increment: 1 },
    },
    create: {
      jobType,
      lastRunAt: now,
      lastRunDate: getDateString(now),
      lastCursor: cursor ? JSON.stringify(cursor) : null,
      runCount: 1,
    },
  });
}

// ===== Job execution =====

/**
 * Start a new job run. Creates a JobRun row with status='running'.
 * Returns the job run ID + a completion function.
 */
export async function startJobRun(
  jobType: JobType,
  opts: { triggeredBy?: 'system' | 'user' | 'cron'; userId?: string; metadata?: Record<string, unknown> } = {},
): Promise<{
  jobRunId: string;
  complete: (result: Omit<JobResult, 'jobRunId' | 'jobType' | 'durationMs'>) => Promise<JobResult>;
}> {
  const startedAt = new Date();
  const triggeredBy = opts.triggeredBy ?? 'system';

  const jobRun = await db.jobRun.create({
    data: {
      jobType,
      status: 'running',
      triggeredBy,
      userId: opts.userId ?? null,
      startedAt,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
    },
  });

  const complete = async (result: Omit<JobResult, 'jobRunId' | 'jobType' | 'durationMs'>): Promise<JobResult> => {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await db.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: result.status,
        completedAt,
        durationMs,
        errorMessage: result.errorMessage,
        result: JSON.stringify(result.result),
      },
    });

    // Update cursor
    await updateJobCursor(jobType, result.result).catch(() => {});

    // Log failures
    if (result.failed > 0 || result.status === 'failed') {
      await db.jobFailureLog.create({
        data: {
          jobRunId: jobRun.id,
          jobType,
          errorType: 'internal_error',
          errorMessage: result.errorMessage ?? `${result.failed} items failed during ${jobType}`,
          payload: JSON.stringify(result.result),
        },
      }).catch(() => {});
    }

    return {
      ...result,
      jobRunId: jobRun.id,
      jobType,
      durationMs,
    };
  };

  return { jobRunId: jobRun.id, complete };
}

/**
 * Run a job with idempotency checking.
 * If the job has already run today and `force` is false, returns early.
 */
export async function runJob(
  jobType: JobType,
  executor: () => Promise<Omit<JobResult, 'jobRunId' | 'jobType' | 'durationMs' | 'status'>>,
  opts: { force?: boolean; triggeredBy?: 'system' | 'user' | 'cron'; userId?: string } = {},
): Promise<JobResult> {
  // Check idempotency (unless forced)
  if (!opts.force && await hasRunToday(jobType)) {
    return {
      jobRunId: '',
      jobType,
      status: 'completed',
      processed: 0,
      created: 0,
      failed: 0,
      skipped: 1,
      durationMs: 0,
      errorMessage: null,
      result: { skipped: 'already run today' },
    };
  }

  const { jobRunId, complete } = await startJobRun(jobType, {
    triggeredBy: opts.triggeredBy,
    userId: opts.userId,
  });

  try {
    const result = await executor();
    const status: JobStatus = result.failed > 0 ? 'partial' : 'completed';
    return await complete({ ...result, status });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Job failed';
    return await complete({
      status: 'failed',
      processed: 0,
      created: 0,
      failed: 1,
      skipped: 0,
      errorMessage,
      result: { error: errorMessage },
    });
  }
}

// ===== Query =====

export async function listJobRuns(
  opts: { jobType?: JobType; status?: JobStatus; limit?: number; offset?: number } = {},
): Promise<{ items: JobRunDTO[]; total: number }> {
  const limit = Math.min(opts.limit ?? 20, 100);
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = {};
  if (opts.jobType) where.jobType = opts.jobType;
  if (opts.status) where.status = opts.status;

  const [runs, total] = await Promise.all([
    db.jobRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.jobRun.count({ where }),
  ]);

  return {
    items: runs.map((r) => ({
      id: r.id,
      jobType: r.jobType as JobType,
      status: r.status as JobStatus,
      triggeredBy: r.triggeredBy as 'system' | 'user' | 'cron',
      userId: r.userId,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      durationMs: r.durationMs,
      errorMessage: r.errorMessage,
      result: r.result ? safeParseJson<Record<string, unknown>>(r.result, {}) : null,
      metadata: r.metadata ? safeParseJson<Record<string, unknown>>(r.metadata, {}) : null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  };
}

export async function getJobRun(id: string): Promise<JobRunDTO | null> {
  const run = await db.jobRun.findUnique({ where: { id } });
  if (!run) return null;
  return {
    id: run.id,
    jobType: run.jobType as JobType,
    status: run.status as JobStatus,
    triggeredBy: run.triggeredBy as 'system' | 'user' | 'cron',
    userId: run.userId,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    durationMs: run.durationMs,
    errorMessage: run.errorMessage,
    result: run.result ? safeParseJson<Record<string, unknown>>(run.result, {}) : null,
    metadata: run.metadata ? safeParseJson<Record<string, unknown>>(run.metadata, {}) : null,
    createdAt: run.createdAt.toISOString(),
  };
}
