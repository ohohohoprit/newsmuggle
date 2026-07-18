/**
 * Studio metrics service — read model for studio data.
 *
 * Provides:
 *   - aggregated studio metrics (totalFollowers, totalViews, byProvider)
 *   - content history (paginated, filterable by provider/type)
 *   - metric snapshots (time-series for follower growth)
 *   - audience demographics (country/gender/age breakdowns)
 *   - studio snapshots (combined view for the dashboard)
 */
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import type {
  SocialProviderSlug,
  SocialContentItemDTO,
  SocialMetricSnapshotDTO,
  SocialAudienceSnapshotDTO,
  StudioMetricsDTO,
  StudioSnapshotDTO,
  StudioSyncJobDTO,
  ConnectedAccountDTO,
} from '@/lib/studio/types';
import { AccountNotFoundError } from '@/lib/studio/errors';

// ===== Helpers =====

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ===== Content history =====

export async function listContent(
  workspaceId: string,
  userId: string,
  opts: {
    provider?: SocialProviderSlug;
    type?: string;
    limit?: number;
    offset?: number;
    since?: Date;
    until?: Date;
  } = {},
): Promise<{ items: SocialContentItemDTO[]; total: number }> {
  await requireMembership(workspaceId, userId);
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  // Build where clause
  const accountWhere: Record<string, unknown> = { workspaceId, isConnected: true };
  if (opts.provider) accountWhere.provider = opts.provider;

  const where: Record<string, unknown> = {
    connectedAccount: accountWhere,
  };
  if (opts.type) where.type = opts.type;
  if (opts.since || opts.until) {
    where.publishedAt = {};
    if (opts.since) (where.publishedAt as { gte?: Date }).gte = opts.since;
    if (opts.until) (where.publishedAt as { lte?: Date }).lte = opts.until;
  }

  const [items, total] = await Promise.all([
    db.socialContentItem.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      skip: offset,
      include: { connectedAccount: { select: { provider: true } } },
    }),
    db.socialContentItem.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      connectedAccountId: item.connectedAccountId,
      provider: item.connectedAccount.provider as SocialProviderSlug,
      providerContentId: item.providerContentId,
      type: item.type as SocialContentItemDTO['type'],
      title: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnailUrl,
      contentUrl: item.contentUrl,
      publishedAt: item.publishedAt.toISOString(),
      durationSeconds: item.durationSeconds,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      shareCount: item.shareCount,
      engagementRate: item.engagementRate,
      tags: safeParseJson<string[]>(item.tags, []),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    total,
  };
}

// ===== Metric snapshots =====

export async function listMetricSnapshots(
  workspaceId: string,
  userId: string,
  opts: {
    provider?: SocialProviderSlug;
    limit?: number;
    offset?: number;
    since?: Date;
    until?: Date;
  } = {},
): Promise<{ items: SocialMetricSnapshotDTO[]; total: number }> {
  await requireMembership(workspaceId, userId);
  const limit = Math.min(opts.limit ?? 30, 365);
  const offset = opts.offset ?? 0;

  const accountWhere: Record<string, unknown> = { workspaceId, isConnected: true };
  if (opts.provider) accountWhere.provider = opts.provider;

  const where: Record<string, unknown> = {
    connectedAccount: accountWhere,
  };
  if (opts.since || opts.until) {
    where.snapshotDate = {};
    if (opts.since) (where.snapshotDate as { gte?: Date }).gte = opts.since;
    if (opts.until) (where.snapshotDate as { lte?: Date }).lte = opts.until;
  }

  const [snapshots, total] = await Promise.all([
    db.socialMetricSnapshot.findMany({
      where,
      orderBy: { snapshotDate: 'desc' },
      take: limit,
      skip: offset,
      include: { connectedAccount: { select: { provider: true } } },
    }),
    db.socialMetricSnapshot.count({ where }),
  ]);

  return {
    items: snapshots.map((s) => ({
      id: s.id,
      connectedAccountId: s.connectedAccountId,
      provider: s.connectedAccount.provider as SocialProviderSlug,
      snapshotDate: s.snapshotDate.toISOString(),
      followerCount: s.followerCount,
      followingCount: s.followingCount,
      totalViews: s.totalViews,
      totalPosts: s.totalPosts,
      newFollowers: s.newFollowers,
      newViews: s.newViews,
      newPosts: s.newPosts,
      avgEngagementRate: s.avgEngagementRate,
      estimatedReach: s.estimatedReach,
      metadata: safeParseJson<Record<string, unknown> | null>(s.metadata, null),
      createdAt: s.createdAt.toISOString(),
    })),
    total,
  };
}

// ===== Audience demographics =====

export async function listAudienceSnapshots(
  workspaceId: string,
  userId: string,
  opts: {
    provider?: SocialProviderSlug;
    limit?: number;
    offset?: number;
    since?: Date;
    until?: Date;
  } = {},
): Promise<{ items: SocialAudienceSnapshotDTO[]; total: number }> {
  await requireMembership(workspaceId, userId);
  const limit = Math.min(opts.limit ?? 100, 500);
  const offset = opts.offset ?? 0;

  const accountWhere: Record<string, unknown> = { workspaceId, isConnected: true };
  if (opts.provider) accountWhere.provider = opts.provider;

  const where: Record<string, unknown> = {
    connectedAccount: accountWhere,
  };
  if (opts.since || opts.until) {
    where.snapshotDate = {};
    if (opts.since) (where.snapshotDate as { gte?: Date }).gte = opts.since;
    if (opts.until) (where.snapshotDate as { lte?: Date }).lte = opts.until;
  }

  const [snapshots, total] = await Promise.all([
    db.socialAudienceSnapshot.findMany({
      where,
      orderBy: [{ snapshotDate: 'desc' }, { percentage: 'desc' }],
      take: limit,
      skip: offset,
      include: { connectedAccount: { select: { provider: true } } },
    }),
    db.socialAudienceSnapshot.count({ where }),
  ]);

  return {
    items: snapshots.map((s) => ({
      id: s.id,
      connectedAccountId: s.connectedAccountId,
      provider: s.connectedAccount.provider as SocialProviderSlug,
      snapshotDate: s.snapshotDate.toISOString(),
      ageRange: s.ageRange,
      gender: s.gender,
      country: s.country,
      city: s.city,
      percentage: s.percentage,
      count: s.count,
      createdAt: s.createdAt.toISOString(),
    })),
    total,
  };
}

// ===== Aggregated studio metrics =====

export async function getStudioMetrics(
  workspaceId: string,
  userId: string,
): Promise<StudioMetricsDTO> {
  await requireMembership(workspaceId, userId);

  const accounts = await db.connectedAccount.findMany({
    where: { workspaceId, isConnected: true },
  });

  const byProvider: Record<string, { accounts: number; followers: number; views: number; posts: number }> = {};
  let totalFollowers = 0;
  let totalViews = 0;
  let totalPosts = 0;

  for (const account of accounts) {
    const provider = account.provider;
    if (!byProvider[provider]) {
      byProvider[provider] = { accounts: 0, followers: 0, views: 0, posts: 0 };
    }
    byProvider[provider].accounts++;
    byProvider[provider].followers += account.followerCount;
    byProvider[provider].views += account.totalViews;
    byProvider[provider].posts += account.totalPosts;
    totalFollowers += account.followerCount;
    totalViews += account.totalViews;
    totalPosts += account.totalPosts;
  }

  // Fetch recent content (top 5)
  const recentContent = await db.socialContentItem.findMany({
    where: { connectedAccount: { workspaceId, isConnected: true } },
    orderBy: { publishedAt: 'desc' },
    take: 5,
    include: { connectedAccount: { select: { provider: true } } },
  });

  // Fetch top content by views (top 5)
  const topContent = await db.socialContentItem.findMany({
    where: { connectedAccount: { workspaceId, isConnected: true } },
    orderBy: { viewCount: 'desc' },
    take: 5,
    include: { connectedAccount: { select: { provider: true } } },
  });

  // Fetch follower growth (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const snapshots = await db.socialMetricSnapshot.findMany({
    where: {
      connectedAccount: { workspaceId, isConnected: true },
      snapshotDate: { gte: since },
    },
    orderBy: { snapshotDate: 'asc' },
    select: {
      snapshotDate: true,
      followerCount: true,
      newFollowers: true,
    },
  });

  const followerGrowth = snapshots.map((s) => ({
    date: s.snapshotDate.toISOString(),
    followers: s.followerCount,
    newFollowers: s.newFollowers,
  }));

  return {
    workspaceId,
    totalAccounts: accounts.length,
    totalFollowers,
    totalViews,
    totalPosts,
    byProvider,
    recentContent: recentContent.map((item) => ({
      id: item.id,
      connectedAccountId: item.connectedAccountId,
      provider: item.connectedAccount.provider as SocialProviderSlug,
      providerContentId: item.providerContentId,
      type: item.type as SocialContentItemDTO['type'],
      title: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnailUrl,
      contentUrl: item.contentUrl,
      publishedAt: item.publishedAt.toISOString(),
      durationSeconds: item.durationSeconds,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      shareCount: item.shareCount,
      engagementRate: item.engagementRate,
      tags: safeParseJson<string[]>(item.tags, []),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    followerGrowth,
    topContent: topContent.map((item) => ({
      id: item.id,
      connectedAccountId: item.connectedAccountId,
      provider: item.connectedAccount.provider as SocialProviderSlug,
      providerContentId: item.providerContentId,
      type: item.type as SocialContentItemDTO['type'],
      title: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnailUrl,
      contentUrl: item.contentUrl,
      publishedAt: item.publishedAt.toISOString(),
      durationSeconds: item.durationSeconds,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      shareCount: item.shareCount,
      engagementRate: item.engagementRate,
      tags: safeParseJson<string[]>(item.tags, []),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

// ===== Studio snapshot (combined dashboard view) =====

export async function getStudioSnapshot(
  workspaceId: string,
  userId: string,
): Promise<StudioSnapshotDTO> {
  await requireMembership(workspaceId, userId);

  const [accounts, metrics] = await Promise.all([
    db.connectedAccount.findMany({
      where: { workspaceId, isConnected: true },
      orderBy: [{ provider: 'asc' }, { createdAt: 'asc' }],
    }),
    getStudioMetrics(workspaceId, userId),
  ]);

  const lastSync = accounts.reduce((latest: Date | null, account) => {
    if (!account.lastSyncedAt) return latest;
    if (!latest || account.lastSyncedAt > latest) return account.lastSyncedAt;
    return latest;
  }, null);

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  return {
    workspaceId,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    accounts: accounts.map((a) => ({
      id: a.id,
      workspaceId: a.workspaceId,
      provider: a.provider as SocialProviderSlug,
      providerAccountId: a.providerAccountId,
      handle: a.handle,
      displayName: a.displayName,
      avatar: a.avatar,
      description: a.description,
      accountType: a.accountType as ConnectedAccountDTO['accountType'],
      followerCount: a.followerCount,
      followingCount: a.followingCount,
      totalViews: a.totalViews,
      totalPosts: a.totalPosts,
      isVerified: a.isVerified,
      isConnected: a.isConnected,
      lastSyncedAt: a.lastSyncedAt?.toISOString() ?? null,
      syncStatus: a.syncStatus as ConnectedAccountDTO['syncStatus'],
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
    metrics,
    lastSyncAt: lastSync?.toISOString() ?? null,
  };
}

// ===== Sync job history =====

export async function listSyncJobs(
  workspaceId: string,
  userId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ items: StudioSyncJobDTO[]; total: number }> {
  await requireMembership(workspaceId, userId);
  const limit = Math.min(opts.limit ?? 20, 100);
  const offset = opts.offset ?? 0;

  const [jobs, total] = await Promise.all([
    db.studioSyncJob.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.studioSyncJob.count({ where: { workspaceId } }),
  ]);

  return {
    items: jobs.map((j) => ({
      id: j.id,
      workspaceId: j.workspaceId,
      connectedAccountId: j.connectedAccountId,
      provider: j.provider as StudioSyncJobDTO['provider'],
      type: j.type as StudioSyncJobDTO['type'],
      status: j.status as StudioSyncJobDTO['status'],
      triggeredBy: j.triggeredBy as StudioSyncJobDTO['triggeredBy'],
      userId: j.userId,
      startedAt: j.startedAt?.toISOString() ?? null,
      completedAt: j.completedAt?.toISOString() ?? null,
      errorMessage: j.errorMessage,
      result: j.result ? safeParseJson<Record<string, unknown>>(j.result, {}) : null,
      createdAt: j.createdAt.toISOString(),
    })),
    total,
  };
}
