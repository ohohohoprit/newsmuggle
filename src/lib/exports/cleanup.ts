/**
 * Export/file cleanup job — cleans up expired files, deleted files,
 * expired signed URLs, and failed export jobs.
 *
 * This job uses the existing jobs runner system with a string job type.
 */
import { runJob } from '@/lib/jobs/runner';
import { cleanupDeletedFiles, cleanupExpiredFiles, cleanupExpiredSignedUrls } from '@/lib/files/service';
import { db } from '@/lib/db';

/**
 * File cleanup job — runs daily to clean up:
 *   - Expired temporary files (soft-delete)
 *   - Soft-deleted files past the grace period (hard-delete from storage + DB)
 *   - Expired signed URL tokens
 *   - Failed export jobs older than 30 days
 */
export async function runFileCleanupJob(opts: { force?: boolean; triggeredBy?: 'system' | 'user' | 'cron'; userId?: string } = {}): Promise<{
  jobRunId: string;
  jobType: string;
  status: string;
  processed: number;
  created: number;
  failed: number;
  skipped: number;
  durationMs: number;
  errorMessage: string | null;
  result: Record<string, unknown>;
}> {
  return runJob(
    'file_cleanup' as never,
    async () => {
      const [expiredFiles, deletedFiles, expiredUrls, oldFailedJobs] = await Promise.all([
        cleanupExpiredFiles(),
        cleanupDeletedFiles(7),
        cleanupExpiredSignedUrls(),
        cleanupOldFailedJobs(),
      ]);

      const totalProcessed = expiredFiles.deleted + deletedFiles.deleted + expiredUrls.deleted + oldFailedJobs.deleted;

      return {
        status: 'completed' as const,
        processed: totalProcessed,
        created: 0,
        failed: 0,
        skipped: 0,
        errorMessage: null,
        result: {
          expiredFiles: expiredFiles.deleted,
          deletedFiles: deletedFiles.deleted,
          expiredSignedUrls: expiredUrls.deleted,
          oldFailedJobs: oldFailedJobs.deleted,
        },
      };
    },
    opts,
  );
}

/** Delete failed export job records older than 30 days. */
async function cleanupOldFailedJobs(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await db.exportJob.deleteMany({
    where: {
      status: 'failed',
      createdAt: { lt: cutoff },
    },
  });
  return { deleted: result.count };
}
