/**
 * Job definitions — the actual business logic for each scheduled job.
 *
 * Each job calls EXISTING service methods from billing, studio, or
 * notifications modules. No business logic is duplicated here.
 *
 * Jobs:
 *   - quota_reset:        calls billing/quota.resetQuota() for all workspaces
 *   - usage_snapshot:     calls billing/quota.createUsageSnapshot() for all workspaces
 *   - threshold_check:    calls billing/quota.checkUsageThresholds() + emits notifications
 *   - stale_check:        calls studio/sync.markStaleAccounts() + emits notifications
 *   - studio_sync:        calls studio/sync.syncAllAccounts() for stale accounts
 *   - notification_cleanup: calls notifications/service.cleanupOldNotifications()
 *   - retry_failed:       calls notifications/delivery.retryPendingDeliveries()
 *   - delivery_retry:     alias for retry_failed
 */
import { db } from '@/lib/db';
import { runJob } from '@/lib/jobs/runner';
import type { JobType, JobResult } from '@/lib/jobs/types';

// Import existing service methods (NO duplication)
import { resetQuota, createUsageSnapshot, getUsageSummary, checkUsageThresholds } from '@/lib/billing/quota';
import { getBillingPeriod } from '@/lib/billing/subscription';
import { markStaleAccounts } from '@/lib/studio/sync';
import { cleanupOldNotifications } from '@/lib/notifications/service';
import { retryPendingDeliveries } from '@/lib/notifications/delivery';
import { emitNotificationEvent } from '@/lib/notifications/events';

// ===== Helpers =====

function getMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

async function getAllWorkspaces(): Promise<string[]> {
  const workspaces = await db.workspace.findMany({
    select: { id: true },
    where: { type: 'team' }, // only team workspaces have subscriptions
  });
  // Also include personal workspaces that have subscriptions
  const personalWithSubs = await db.subscription.findMany({
    select: { workspaceId: true },
  });
  const ids = new Set<string>(workspaces.map((w) => w.id));
  for (const s of personalWithSubs) ids.add(s.workspaceId);
  return Array.from(ids);
}

// ===== Job definitions =====

/**
 * Monthly quota reset — resets the generation quota for all workspaces
 * at the start of each billing period.
 */
export async function runQuotaResetJob(opts: { force?: boolean; triggeredBy?: 'system' | 'user' | 'cron'; userId?: string } = {}): Promise<JobResult> {
  return runJob(
    'quota_reset',
    async () => {
      const workspaceIds = await getAllWorkspaces();
      const { start, end } = getMonthRange();
      let processed = 0;
      let failed = 0;
      let notificationsSent = 0;

      for (const workspaceId of workspaceIds) {
        try {
          await resetQuota(workspaceId, start, end);
          processed++;

          // Emit quota.reset notification
          try {
            const workspace = await db.workspace.findUnique({
              where: { id: workspaceId },
              select: { ownerId: true },
            });
            const usage = await getUsageSummary(workspaceId);
            if (workspace) {
              await emitNotificationEvent({
                workspaceId,
                userId: workspace.ownerId,
                eventType: 'quota.reset',
                source: 'quota',
                payload: {
                  workspaceId,
                  limit: usage.generationsLimit,
                  periodStart: start.toISOString(),
                  periodEnd: end.toISOString(),
                },
              });
              notificationsSent++;
            }
          } catch {
            // notification failure shouldn't fail the job
          }
        } catch (err) {
          failed++;
          console.error(`[quota_reset] failed for workspace ${workspaceId}:`, err);
        }
      }

      return {
        status: failed > 0 ? 'partial' : 'completed',
        processed,
        created: notificationsSent,
        failed,
        skipped: 0,
        errorMessage: null,
        result: { workspaceIds: workspaceIds.length, processed, notificationsSent, failed },
      };
    },
    opts,
  );
}

/**
 * Daily usage snapshot — creates an archival snapshot of usage for each
 * workspace with an active subscription.
 */
export async function runUsageSnapshotJob(opts: { force?: boolean; triggeredBy?: 'system' | 'user' | 'cron'; userId?: string } = {}): Promise<JobResult> {
  return runJob(
    'usage_snapshot',
    async () => {
      const workspaceIds = await getAllWorkspaces();
      const { start, end } = getMonthRange();
      let processed = 0;
      let failed = 0;

      for (const workspaceId of workspaceIds) {
        try {
          // Resolve the workspace's plan slug
          const sub = await db.subscription.findUnique({
            where: { workspaceId },
            include: { plan: { select: { slug: true } } },
          });
          const planSlug = sub?.plan.slug ?? 'starter';

          await createUsageSnapshot(workspaceId, start, end, planSlug as 'starter' | 'creator' | 'agency');
          processed++;
        } catch (err) {
          failed++;
          console.error(`[usage_snapshot] failed for workspace ${workspaceId}:`, err);
        }
      }

      return {
        status: failed > 0 ? 'partial' : 'completed',
        processed,
        created: processed,
        failed,
        skipped: 0,
        errorMessage: null,
        result: { workspaceIds: workspaceIds.length, snapshotsCreated: processed, failed },
      };
    },
    opts,
  );
}

/**
 * Threshold check — checks if any workspace has crossed 80/90/100% usage
 * and emits notifications (with dedup to prevent repeats).
 */
export async function runThresholdCheckJob(opts: { force?: boolean; triggeredBy?: 'system' | 'user' | 'cron'; userId?: string } = {}): Promise<JobResult> {
  return runJob(
    'threshold_check',
    async () => {
      const workspaceIds = await getAllWorkspaces();
      let processed = 0;
      let notificationsSent = 0;
      let failed = 0;
      const periodKey = getMonthRange().start.toISOString().slice(0, 7); // YYYY-MM

      for (const workspaceId of workspaceIds) {
        try {
          const thresholds = await checkUsageThresholds(workspaceId);
          processed++;

          if (thresholds.length > 0) {
            const usage = await getUsageSummary(workspaceId);
            const workspace = await db.workspace.findUnique({
              where: { id: workspaceId },
              select: { ownerId: true },
            });

            for (const threshold of thresholds) {
              // Create a dedup alert record (unique on alertKey)
              const alertKey = `${workspaceId}:${threshold}:${periodKey}`;
              try {
                await db.usageThresholdAlert.create({
                  data: {
                    workspaceId,
                    threshold,
                    percentUsed: usage.percentUsed,
                    used: usage.generationsUsed,
                    limit: usage.generationsLimit,
                    planSlug: usage.planSlug ?? 'starter',
                    alertKey,
                  },
                });

                // Emit notification (dedup key in events.ts prevents duplicates)
                if (workspace) {
                  await emitNotificationEvent({
                    workspaceId,
                    userId: workspace.ownerId,
                    eventType: 'quota.threshold_reached',
                    source: 'quota',
                    payload: {
                      workspaceId,
                      threshold,
                      percentUsed: usage.percentUsed,
                      used: usage.generationsUsed,
                      limit: usage.generationsLimit,
                      periodKey,
                    },
                  });
                  notificationsSent++;
                }
              } catch (err) {
                // alertKey unique constraint = already alerted this period, skip
              }
            }
          }
        } catch (err) {
          failed++;
          console.error(`[threshold_check] failed for workspace ${workspaceId}:`, err);
        }
      }

      return {
        status: failed > 0 ? 'partial' : 'completed',
        processed,
        created: notificationsSent,
        failed,
        skipped: 0,
        errorMessage: null,
        result: { workspaceIds: workspaceIds.length, notificationsSent, failed },
      };
    },
    opts,
  );
}

/**
 * Stale account check — marks studio accounts as stale if not synced in 24h
 * + emits notifications to workspace owners.
 */
export async function runStaleCheckJob(opts: { force?: boolean; triggeredBy?: 'system' | 'user' | 'cron'; userId?: string } = {}): Promise<JobResult> {
  return runJob(
    'stale_check',
    async () => {
      // Call existing studio service method
      const { marked } = await markStaleAccounts();

      // For each newly-stale account, emit a notification
      const staleAccounts = await db.connectedAccount.findMany({
        where: { syncStatus: 'stale', isConnected: true },
        select: { id: true, workspaceId: true, provider: true, displayName: true },
      });

      let notificationsSent = 0;
      for (const account of staleAccounts) {
        try {
          const workspace = await db.workspace.findUnique({
            where: { id: account.workspaceId },
            select: { ownerId: true },
          });
          if (workspace) {
            await emitNotificationEvent({
              workspaceId: account.workspaceId,
              userId: workspace.ownerId,
              eventType: 'studio.account_stale',
              source: 'studio',
              payload: {
                workspaceId: account.workspaceId,
                provider: account.provider,
                accountId: account.id,
                displayName: account.displayName,
              },
            });
            notificationsSent++;
          }
        } catch {
          // notification failure shouldn't fail the job
        }
      }

      return {
        status: 'completed',
        processed: marked,
        created: notificationsSent,
        failed: 0,
        skipped: 0,
        errorMessage: null,
        result: { markedStale: marked, notificationsSent },
      };
    },
    opts,
  );
}

/**
 * Studio sync — triggers incremental sync for connected accounts that
 * haven't synced recently (stale or > 6 hours since last sync).
 */
export async function runStudioSyncJob(opts: { force?: boolean; triggeredBy?: 'system' | 'user' | 'cron'; userId?: string } = {}): Promise<JobResult> {
  return runJob(
    'studio_sync',
    async () => {
      // Find accounts that need syncing (stale or last synced > 6h ago)
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const accounts = await db.connectedAccount.findMany({
        where: {
          isConnected: true,
          OR: [
            { syncStatus: 'stale' },
            { lastSyncedAt: { lt: sixHoursAgo } },
            { lastSyncedAt: null },
          ],
        },
        select: { id: true, workspaceId: true, provider: true },
      });

      let processed = 0;
      let failed = 0;

      // Group by workspace to sync efficiently
      const byWorkspace = new Map<string, string[]>();
      for (const account of accounts) {
        const list = byWorkspace.get(account.workspaceId) ?? [];
        list.push(account.provider);
        byWorkspace.set(account.workspaceId, list);
      }

      const { syncAllAccounts } = await import('@/lib/studio/sync');
      for (const [workspaceId] of byWorkspace) {
        try {
          await syncAllAccounts(workspaceId, 'system');
          processed++;
        } catch (err) {
          failed++;
          console.error(`[studio_sync] failed for workspace ${workspaceId}:`, err);
        }
      }

      return {
        status: failed > 0 ? 'partial' : 'completed',
        processed,
        created: 0,
        failed,
        skipped: 0,
        errorMessage: null,
        result: { accountsNeedingSync: accounts.length, workspacesProcessed: processed, failed },
      };
    },
    opts,
  );
}

/**
 * Notification cleanup — deletes old read notifications.
 */
export async function runNotificationCleanupJob(opts: { force?: boolean; triggeredBy?: 'system' | 'user' | 'cron'; userId?: string } = {}): Promise<JobResult> {
  return runJob(
    'notification_cleanup',
    async () => {
      const { deleted } = await cleanupOldNotifications({ olderThanDays: 30 });
      return {
        status: 'completed',
        processed: deleted,
        created: 0,
        failed: 0,
        skipped: 0,
        errorMessage: null,
        result: { deleted, olderThanDays: 30 },
      };
    },
    opts,
  );
}

/**
 * Retry failed notification deliveries.
 */
export async function runRetryFailedJob(opts: { force?: boolean; triggeredBy?: 'system' | 'user' | 'cron'; userId?: string } = {}): Promise<JobResult> {
  return runJob(
    'retry_failed',
    async () => {
      const result = await retryPendingDeliveries(100);
      return {
        status: result.failed > 0 ? 'partial' : 'completed',
        processed: result.retried,
        created: result.succeeded,
        failed: result.failed,
        skipped: 0,
        errorMessage: null,
        result,
      };
    },
    opts,
  );
}

// ===== Job dispatcher =====

const JOB_EXECUTORS: Record<JobType, (opts: { force?: boolean; triggeredBy?: 'system' | 'user' | 'cron'; userId?: string }) => Promise<JobResult>> = {
  quota_reset: runQuotaResetJob,
  usage_snapshot: runUsageSnapshotJob,
  threshold_check: runThresholdCheckJob,
  stale_check: runStaleCheckJob,
  studio_sync: runStudioSyncJob,
  notification_cleanup: runNotificationCleanupJob,
  retry_failed: runRetryFailedJob,
  delivery_retry: runRetryFailedJob,
};

/**
 * Run a job by type. This is the main entry point for the admin API
 * and the cron scheduler.
 */
export async function runJobByType(
  jobType: JobType,
  opts: { force?: boolean; triggeredBy?: 'system' | 'user' | 'cron'; userId?: string } = {},
): Promise<JobResult> {
  const executor = JOB_EXECUTORS[jobType];
  if (!executor) {
    throw new Error(`Unknown job type: ${jobType}`);
  }
  return executor(opts);
}
