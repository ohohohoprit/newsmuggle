/**
 * Studio sync service — handles syncing data from social providers.
 *
 * Sync types:
 *   - full:        profile + content + metrics + audience
 *   - incremental: content only (using cursor from last sync)
 *   - metrics:     just the metrics snapshot
 *   - content:     just the content items
 *   - audience:    just the audience demographics
 *
 * Sync flow:
 *   1. Create a StudioSyncJob row (status=running)
 *   2. Refresh access token if expired
 *   3. Call provider.sync() / provider.fetchContent() etc.
 *   4. Persist content items (upsert by providerContentId)
 *   5. Persist metric snapshot (upsert by snapshotDate)
 *   6. Persist audience segments
 *   7. Update ConnectedAccount with latest counts + lastSyncedAt + cursor
 *   8. Mark job as completed (or failed/partial)
 *   9. On failure, log to SyncFailureLog
 *
 * Stale detection: if lastSyncedAt > 24h ago, syncStatus is marked 'stale'.
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/auth';
import { getProvider } from '@/lib/studio/providers';
import type {
  SocialProviderSlug,
  SyncJobType,
  SyncResult,
  SyncStatus,
} from '@/lib/studio/types';
import {
  AccountNotFoundError,
  SyncInProgressError,
  StudioError,
} from '@/lib/studio/errors';
import { getRawAccount } from '@/lib/studio/accounts';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between manual syncs

// ===== Helpers =====

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getUtcMidnight(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// ===== Token refresh =====

async function ensureValidToken(account: {
  id: string;
  provider: string;
  providerAccountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}): Promise<string> {
  if (!account.accessToken) {
    throw new StudioError('AUTH_ERROR', `Account ${account.provider} has no access token. Please reconnect.`, 401, {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    });
  }

  // Check if token is expired (or expires within 5 minutes)
  const now = new Date();
  const expiresAt = account.tokenExpiresAt;
  const needsRefresh = !expiresAt || expiresAt.getTime() < now.getTime() + 5 * 60 * 1000;

  if (!needsRefresh) {
    return account.accessToken;
  }

  // Try to refresh
  const provider = getProvider(account.provider as SocialProviderSlug);
  const refreshed = await provider.refreshAccessToken({
    providerAccountId: account.providerAccountId,
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    tokenExpiresAt: account.tokenExpiresAt,
  });

  if (!refreshed) {
    // Can't refresh — token is expired
    throw new StudioError('AUTH_ERROR', `Account ${account.provider} token expired and cannot be refreshed. Please reconnect.`, 401, {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    });
  }

  // Persist the new tokens
  await db.connectedAccount.update({
    where: { id: account.id },
    data: {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      tokenExpiresAt: refreshed.tokenExpiresAt,
    },
  });

  return refreshed.accessToken;
}

// ===== Sync execution =====

/**
 * Run a sync for a specific connected account.
 * Creates a StudioSyncJob row, executes the sync, and updates the account.
 */
export async function syncAccount(
  workspaceId: string,
  userId: string,
  providerSlug: SocialProviderSlug,
  opts: {
    type?: SyncJobType;
    triggeredBy?: 'system' | 'user' | 'webhook';
  } = {},
  req?: Request,
): Promise<SyncResult> {
  const type = opts.type ?? 'incremental';
  const triggeredBy = opts.triggeredBy ?? 'user';

  // Get the connected account
  const account = await getRawAccount(workspaceId, providerSlug);
  if (!account.accessToken) {
    throw new StudioError('AUTH_ERROR', `Account ${providerSlug} has no access token. Please reconnect.`, 401);
  }

  // Check for in-progress sync (cooldown)
  if (account.syncStatus === 'syncing') {
    const updatedAt = new Date(account.updatedAt).getTime();
    if (Date.now() - updatedAt < SYNC_COOLDOWN_MS) {
      throw new SyncInProgressError(providerSlug);
    }
  }

  const startedAt = new Date();
  const startTime = Date.now();

  // Create sync job
  const job = await db.studioSyncJob.create({
    data: {
      workspaceId,
      connectedAccountId: account.id,
      provider: providerSlug,
      type,
      status: 'running',
      triggeredBy,
      userId: triggeredBy === 'user' ? userId : null,
      startedAt,
    },
  });

  // Mark account as syncing
  await db.connectedAccount.update({
    where: { id: account.id },
    data: { syncStatus: 'syncing' },
  });

  let itemsSynced = 0;
  let snapshotsCreated = 0;
  let failures = 0;
  let nextCursor: string | null = null;
  let hasMore = false;
  let errorMessage: string | null = null;
  let status: 'completed' | 'failed' | 'partial' = 'completed';

  try {
    // Ensure valid token
    const accessToken = await ensureValidToken(account);

    const provider = getProvider(providerSlug);
    const cursor = safeParseJson<{ nextCursor?: string } | null>(account.syncCursor, null)?.nextCursor ?? null;

    // Execute sync based on type
    const syncOpts = {
      cursor: type === 'incremental' ? cursor : null,
      limit: 50,
      includeContent: type === 'full' || type === 'content' || type === 'incremental',
      includeMetrics: type === 'full' || type === 'metrics',
      includeAudience: type === 'full' || type === 'audience',
    };

    const result = await provider.sync(
      {
        providerAccountId: account.providerAccountId,
        accessToken,
        refreshToken: account.refreshToken,
      },
      syncOpts,
    );

    // 1. Update account profile
    if (result.profile) {
      await db.connectedAccount.update({
        where: { id: account.id },
        data: {
          handle: result.profile.handle,
          displayName: result.profile.displayName,
          avatar: result.profile.avatar,
          description: result.profile.description,
          accountType: result.profile.accountType,
          followerCount: result.profile.followerCount,
          followingCount: result.profile.followingCount,
          totalViews: result.profile.totalViews,
          totalPosts: result.profile.totalPosts,
          isVerified: result.profile.isVerified,
        },
      });
    }

    // 2. Persist content items
    if (result.content.length > 0) {
      for (const item of result.content) {
        await db.socialContentItem.upsert({
          where: {
            connectedAccountId_providerContentId: {
              connectedAccountId: account.id,
              providerContentId: item.providerContentId,
            },
          },
          update: {
            type: item.type,
            title: item.title,
            description: item.description,
            thumbnailUrl: item.thumbnailUrl,
            contentUrl: item.contentUrl,
            publishedAt: item.publishedAt,
            durationSeconds: item.durationSeconds,
            viewCount: item.viewCount,
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            shareCount: item.shareCount,
            engagementRate: item.engagementRate,
            tags: JSON.stringify(item.tags),
            metadata: JSON.stringify(item.metadata),
          },
          create: {
            connectedAccountId: account.id,
            providerContentId: item.providerContentId,
            type: item.type,
            title: item.title,
            description: item.description,
            thumbnailUrl: item.thumbnailUrl,
            contentUrl: item.contentUrl,
            publishedAt: item.publishedAt,
            durationSeconds: item.durationSeconds,
            viewCount: item.viewCount,
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            shareCount: item.shareCount,
            engagementRate: item.engagementRate,
            tags: JSON.stringify(item.tags),
            metadata: JSON.stringify(item.metadata),
          },
        });
        itemsSynced++;
      }
    }

    // 3. Persist metric snapshot
    if (result.metrics) {
      const snapshotDate = getUtcMidnight(result.metrics.snapshotDate);
      await db.socialMetricSnapshot.upsert({
        where: {
          connectedAccountId_snapshotDate: {
            connectedAccountId: account.id,
            snapshotDate,
          },
        },
        update: {
          followerCount: result.metrics.followerCount,
          followingCount: result.metrics.followingCount,
          totalViews: result.metrics.totalViews,
          totalPosts: result.metrics.totalPosts,
          newFollowers: result.metrics.newFollowers,
          newViews: result.metrics.newViews,
          newPosts: result.metrics.newPosts,
          avgEngagementRate: result.metrics.avgEngagementRate,
          estimatedReach: result.metrics.estimatedReach,
          metadata: JSON.stringify(result.metrics.metadata),
        },
        create: {
          connectedAccountId: account.id,
          snapshotDate,
          followerCount: result.metrics.followerCount,
          followingCount: result.metrics.followingCount,
          totalViews: result.metrics.totalViews,
          totalPosts: result.metrics.totalPosts,
          newFollowers: result.metrics.newFollowers,
          newViews: result.metrics.newViews,
          newPosts: result.metrics.newPosts,
          avgEngagementRate: result.metrics.avgEngagementRate,
          estimatedReach: result.metrics.estimatedReach,
          metadata: JSON.stringify(result.metrics.metadata),
        },
      });
      snapshotsCreated++;
    }

    // 4. Persist audience segments
    if (result.audience.length > 0) {
      const snapshotDate = getUtcMidnight();
      // Delete old audience snapshots for this date (replace, not upsert)
      await db.socialAudienceSnapshot.deleteMany({
        where: { connectedAccountId: account.id, snapshotDate },
      });
      for (const segment of result.audience) {
        await db.socialAudienceSnapshot.create({
          data: {
            connectedAccountId: account.id,
            snapshotDate,
            ageRange: segment.ageRange,
            gender: segment.gender,
            country: segment.country,
            city: segment.city,
            percentage: segment.percentage,
            count: segment.count,
            metadata: JSON.stringify(segment.metadata),
          },
        });
        snapshotsCreated++;
      }
    }

    nextCursor = result.nextCursor;
    hasMore = result.hasMore;

    if (itemsSynced === 0 && snapshotsCreated === 0) {
      status = 'completed'; // still successful, just no new data
    } else if (failures > 0) {
      status = 'partial';
    }
  } catch (err) {
    status = 'failed';
    errorMessage = err instanceof Error ? err.message : 'Sync failed.';

    // Log the failure
    await db.syncFailureLog.create({
      data: {
        connectedAccountId: account.id,
        syncJobId: job.id,
        errorType: classifyError(err),
        errorMessage,
        payload: JSON.stringify({ type, provider: providerSlug }),
      },
    });
  }

  const completedAt = new Date();
  const latencyMs = Date.now() - startTime;

  // Update job
  await db.studioSyncJob.update({
    where: { id: job.id },
    data: {
      status,
      completedAt,
      errorMessage,
      result: JSON.stringify({ itemsSynced, snapshotsCreated, failures, nextCursor, hasMore }),
    },
  });

  // Update account sync status
  const newSyncStatus: SyncStatus = status === 'failed' ? 'failed' : 'synced';
  await db.connectedAccount.update({
    where: { id: account.id },
    data: {
      syncStatus: newSyncStatus,
      lastSyncedAt: status === 'failed' ? account.lastSyncedAt : completedAt,
      syncCursor: nextCursor ? JSON.stringify({ nextCursor, syncedAt: completedAt.toISOString() }) : account.syncCursor,
    },
  });

  if (req && userId) {
    await auditLog('studio_sync', userId, req, status === 'failed' ? 'failed' : 'success', {
      workspaceId,
      provider: providerSlug,
      type,
      jobId: job.id,
      itemsSynced,
      snapshotsCreated,
      latencyMs,
    });
  }

  return {
    jobId: job.id,
    connectedAccountId: account.id,
    provider: providerSlug,
    type,
    status,
    itemsSynced,
    snapshotsCreated,
    failures,
    nextCursor,
    hasMore,
    errorMessage,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    latencyMs,
  };
}

/**
 * Sync all connected accounts in a workspace.
 */
export async function syncAllAccounts(
  workspaceId: string,
  userId: string,
  req?: Request,
): Promise<SyncResult[]> {
  const accounts = await db.connectedAccount.findMany({
    where: { workspaceId, isConnected: true },
  });

  const results: SyncResult[] = [];
  for (const account of accounts) {
    try {
      const result = await syncAccount(workspaceId, userId, account.provider as SocialProviderSlug, { type: 'incremental' }, req);
      results.push(result);
    } catch (err) {
      // Continue with other accounts even if one fails
      results.push({
        jobId: '',
        connectedAccountId: account.id,
        provider: account.provider as SocialProviderSlug,
        type: 'incremental',
        status: 'failed',
        itemsSynced: 0,
        snapshotsCreated: 0,
        failures: 1,
        nextCursor: null,
        hasMore: false,
        errorMessage: err instanceof Error ? err.message : 'Sync failed.',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        latencyMs: 0,
      });
    }
  }

  return results;
}

/**
 * Mark accounts as stale if they haven't been synced in 24h.
 * Called by a cron job.
 */
export async function markStaleAccounts(): Promise<{ marked: number }> {
  const threshold = new Date(Date.now() - STALE_THRESHOLD_MS);
  const result = await db.connectedAccount.updateMany({
    where: {
      isConnected: true,
      lastSyncedAt: { lt: threshold },
      syncStatus: { not: 'syncing' },
    },
    data: { syncStatus: 'stale' },
  });
  return { marked: result.count };
}

// ===== Error classification =====

function classifyError(err: unknown): string {
  if (err instanceof StudioError) {
    if (err.code === 'AUTH_ERROR') return 'auth_error';
    if (err.code === 'RATE_LIMIT') return 'rate_limit';
  }
  if (err instanceof Error) {
    if (/network|fetch|timeout/i.test(err.message)) return 'network';
    if (/parse|json/i.test(err.message)) return 'parse_error';
  }
  return 'provider_error';
}
