/**
 * Studio shared types — used across the studio service layer, providers,
 * route handlers, and the sync system.
 */

// ===== Provider slugs =====

export type SocialProviderSlug = 'youtube' | 'instagram' | 'facebook' | 'tiktok';

export const ALL_SOCIAL_PROVIDERS: SocialProviderSlug[] = ['youtube', 'instagram', 'facebook', 'tiktok'];

export const ACTIVE_PROVIDERS: SocialProviderSlug[] = ['youtube', 'instagram'];
export const FUTURE_PROVIDERS: SocialProviderSlug[] = ['facebook', 'tiktok'];

// ===== Account types =====

export type AccountType = 'personal' | 'business' | 'creator';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'stale';
export type SyncJobType = 'full' | 'incremental' | 'metrics' | 'content' | 'audience';
export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial';
export type ContentType = 'video' | 'post' | 'reel' | 'story' | 'short';
export type ErrorType = 'auth_error' | 'rate_limit' | 'network' | 'provider_error' | 'parse_error';

// ===== DTOs (returned to API consumers) =====

export interface ConnectedAccountDTO {
  id: string;
  workspaceId: string;
  provider: SocialProviderSlug;
  providerAccountId: string;
  handle: string | null;
  displayName: string | null;
  avatar: string | null;
  description: string | null;
  accountType: AccountType;
  followerCount: number;
  followingCount: number;
  totalViews: number;
  totalPosts: number;
  isVerified: boolean;
  isConnected: boolean;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SocialContentItemDTO {
  id: string;
  connectedAccountId: string;
  provider: SocialProviderSlug;
  providerContentId: string;
  type: ContentType;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  contentUrl: string | null;
  publishedAt: string;
  durationSeconds: number | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  engagementRate: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SocialMetricSnapshotDTO {
  id: string;
  connectedAccountId: string;
  provider: SocialProviderSlug;
  snapshotDate: string;
  followerCount: number;
  followingCount: number;
  totalViews: number;
  totalPosts: number;
  newFollowers: number;
  newViews: number;
  newPosts: number;
  avgEngagementRate: number;
  estimatedReach: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface SocialAudienceSnapshotDTO {
  id: string;
  connectedAccountId: string;
  provider: SocialProviderSlug;
  snapshotDate: string;
  ageRange: string | null;
  gender: string | null;
  country: string | null;
  city: string | null;
  percentage: number;
  count: number;
  createdAt: string;
}

export interface StudioSyncJobDTO {
  id: string;
  workspaceId: string;
  connectedAccountId: string | null;
  provider: SocialProviderSlug | 'all';
  type: SyncJobType;
  status: SyncJobStatus;
  triggeredBy: 'system' | 'user' | 'webhook';
  userId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  result: Record<string, unknown> | null;
  createdAt: string;
}

export interface StudioMetricsDTO {
  workspaceId: string;
  totalAccounts: number;
  totalFollowers: number;
  totalViews: number;
  totalPosts: number;
  byProvider: Record<string, {
    accounts: number;
    followers: number;
    views: number;
    posts: number;
  }>;
  recentContent: SocialContentItemDTO[];
  followerGrowth: Array<{ date: string; followers: number; newFollowers: number }>;
  topContent: SocialContentItemDTO[];
}

export interface StudioSnapshotDTO {
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  accounts: ConnectedAccountDTO[];
  metrics: StudioMetricsDTO;
  lastSyncAt: string | null;
}

// ===== Provider interface =====

export interface ProviderAccountProfile {
  providerAccountId: string;
  handle: string | null;
  displayName: string | null;
  avatar: string | null;
  description: string | null;
  accountType: AccountType;
  followerCount: number;
  followingCount: number;
  totalViews: number;
  totalPosts: number;
  isVerified: boolean;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  tokenScope: string[];
  metadata: Record<string, unknown>;
}

export interface ProviderContentItem {
  providerContentId: string;
  type: ContentType;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  contentUrl: string | null;
  publishedAt: Date;
  durationSeconds: number | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  engagementRate: number;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface ProviderMetricsSnapshot {
  snapshotDate: Date;
  followerCount: number;
  followingCount: number;
  totalViews: number;
  totalPosts: number;
  newFollowers: number;
  newViews: number;
  newPosts: number;
  avgEngagementRate: number;
  estimatedReach: number;
  metadata: Record<string, unknown>;
}

export interface ProviderAudienceSegment {
  snapshotDate: Date;
  ageRange: string | null;
  gender: string | null;
  country: string | null;
  city: string | null;
  percentage: number;
  count: number;
  metadata: Record<string, unknown>;
}

export interface ProviderSyncResult {
  profile?: ProviderAccountProfile;
  content: ProviderContentItem[];
  metrics: ProviderMetricsSnapshot | null;
  audience: ProviderAudienceSegment[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ProviderInfo {
  slug: SocialProviderSlug;
  name: string;
  available: boolean;
  configured: boolean;
  supportsOAuth: boolean;
  supportsContent: boolean;
  supportsMetrics: boolean;
  supportsAudience: boolean;
  oauthScopes: string[];
  authUrlEnvVar: string;
}

// ===== Sync result =====

export interface SyncResult {
  jobId: string;
  connectedAccountId: string;
  provider: SocialProviderSlug;
  type: SyncJobType;
  status: SyncJobStatus;
  itemsSynced: number;
  snapshotsCreated: number;
  failures: number;
  nextCursor: string | null;
  hasMore: boolean;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
}

// ===== OAuth =====

export interface OAuthInitResult {
  provider: SocialProviderSlug;
  authUrl: string;
  state: string;
}

export interface OAuthCallbackInput {
  provider: SocialProviderSlug;
  code: string;
  state: string;
  workspaceId: string;
  userId: string;
}
