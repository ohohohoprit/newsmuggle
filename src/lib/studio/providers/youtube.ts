/**
 * YouTube social provider — implements the SocialProvider interface
 * using the YouTube Data API v3 + Google OAuth 2.0.
 *
 * Environment variables required:
 *   - YOUTUBE_CLIENT_ID       (Google OAuth client ID)
 *   - YOUTUBE_CLIENT_SECRET   (Google OAuth client secret)
 *
 * API endpoints used:
 *   - https://accounts.google.com/o/oauth2/v2/auth  (OAuth)
 *   - https://oauth2.googleapis.com/token           (token exchange)
 *   - https://www.googleapis.com/youtube/v3/channels  (profile)
 *   - https://www.googleapis.com/youtube/v3/search    (content)
 *   - https://www.googleapis.com/youtube/v3/videos    (video stats)
 *   - https://youtubeanalytics.googleapis.com/v2/reports (analytics)
 *
 * NOTE: This provider is fully implemented but will return
 * ProviderNotConfiguredError until the env vars are set.
 */
import type {
  SocialProviderSlug,
  ProviderInfo,
  OAuthInitResult,
  ProviderAccountProfile,
  ProviderContentItem,
  ProviderMetricsSnapshot,
  ProviderAudienceSegment,
  AccountType,
  ContentType,
} from '@/lib/studio/types';
import { SocialProvider, type OAuthCallbackResult, type SyncOptions } from '@/lib/studio/providers/base';
import { ProviderNotConfiguredError, OAuthCallbackFailedError, StudioAuthError } from '@/lib/studio/errors';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails?: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
    customUrl?: string;
    country?: string;
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
    hiddenSubscriberCount: boolean;
  };
  contentDetails?: {
    relatedPlaylists?: { uploads?: string };
  };
}

interface YouTubeSearchResult {
  id: { videoId?: string; kind: string };
  snippet: {
    publishedAt: string;
    title: string;
    description: string;
    thumbnails: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
  };
}

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
    tags?: string[];
    categoryId: string;
    duration?: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails?: { duration: string; definition: string };
}

export class YouTubeProvider extends SocialProvider {
  readonly slug: SocialProviderSlug = 'youtube';
  readonly name = 'YouTube';
  protected readonly clientIdEnvVar = 'YOUTUBE_CLIENT_ID';
  protected readonly clientSecretEnvVar = 'YOUTUBE_CLIENT_SECRET';
  protected readonly oauthScopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ];

  private get authBaseUrl(): string {
    return 'https://accounts.google.com/o/oauth2/v2/auth';
  }

  private get tokenUrl(): string {
    return 'https://oauth2.googleapis.com/token';
  }

  private get apiBaseUrl(): string {
    return 'https://www.googleapis.com/youtube/v3';
  }

  private get analyticsBaseUrl(): string {
    return 'https://youtubeanalytics.googleapis.com/v2';
  }

  isAvailable(): boolean {
    return true;
  }

  private requireConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError('youtube');
    }
  }

  buildAuthUrl(workspaceId: string, userId: string): OAuthInitResult {
    this.requireConfigured();
    const state = this.generateState(workspaceId, userId);
    const params = new URLSearchParams({
      client_id: this.getClientId()!,
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      scope: this.oauthScopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return {
      provider: this.slug,
      authUrl: `${this.authBaseUrl}?${params.toString()}`,
      state,
    };
  }

  async exchangeCodeForTokens(code: string, state: string): Promise<OAuthCallbackResult> {
    this.requireConfigured();
    this.verifyState(state);

    // Exchange code for tokens
    const tokenRes = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.getClientId()!,
        client_secret: this.getClientSecret()!,
        redirect_uri: this.getRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '');
      throw new OAuthCallbackFailedError('youtube', `Token exchange failed: ${errText}`);
    }

    const tokens = (await tokenRes.json()) as GoogleTokenResponse;

    // Fetch the channel profile using the access token
    const profile = await this.fetchProfileWithToken(tokens.access_token);

    return {
      profile: {
        ...profile,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        tokenScope: tokens.scope.split(' '),
      },
    };
  }

  async refreshAccessToken(account: {
    providerAccountId: string;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
  }): Promise<{ accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null } | null> {
    this.requireConfigured();
    if (!account.refreshToken) return null;

    const tokenRes = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.getClientId()!,
        client_secret: this.getClientSecret()!,
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenRes.ok) {
      throw new StudioAuthError('youtube', 'Token refresh failed. Please reconnect the account.');
    }

    const tokens = (await tokenRes.json()) as GoogleTokenResponse;
    return {
      accessToken: tokens.access_token,
      refreshToken: account.refreshToken, // Google doesn't return a new refresh token
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };
  }

  async fetchProfile(account: {
    providerAccountId: string;
    accessToken: string;
    refreshToken: string | null;
  }): Promise<ProviderAccountProfile> {
    return this.fetchProfileWithToken(account.accessToken);
  }

  private async fetchProfileWithToken(accessToken: string): Promise<ProviderAccountProfile> {
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      mine: 'true',
    });
    const res = await fetch(`${this.apiBaseUrl}/channels?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) throw new StudioAuthError('youtube', 'Access token expired or invalid.');
      throw new OAuthCallbackFailedError('youtube', `Profile fetch failed: ${res.status}`);
    }

    const data = (await res.json()) as { items?: YouTubeChannel[] };
    const channel = data.items?.[0];
    if (!channel) {
      throw new OAuthCallbackFailedError('youtube', 'No YouTube channel found for this account.');
    }

    return {
      providerAccountId: channel.id,
      handle: channel.snippet.customUrl ?? null,
      displayName: channel.snippet.title,
      avatar: channel.snippet.thumbnails?.high?.url ?? channel.snippet.thumbnails?.default?.url ?? null,
      description: channel.snippet.description || null,
      accountType: 'creator' as AccountType,
      followerCount: channel.statistics.hiddenSubscriberCount ? 0 : parseInt(channel.statistics.subscriberCount, 10) || 0,
      followingCount: 0,
      totalViews: parseInt(channel.statistics.viewCount, 10) || 0,
      totalPosts: parseInt(channel.statistics.videoCount, 10) || 0,
      isVerified: false,
      accessToken: '', // filled by caller
      refreshToken: null,
      tokenExpiresAt: null,
      tokenScope: [],
      metadata: {
        country: channel.snippet.country ?? null,
        uploadsPlaylist: channel.contentDetails?.relatedPlaylists?.uploads ?? null,
      },
    };
  }

  async fetchContent(
    account: { providerAccountId: string; accessToken: string },
    opts: SyncOptions,
  ): Promise<{ items: ProviderContentItem[]; nextCursor: string | null; hasMore: boolean }> {
    this.requireConfigured();
    const limit = Math.min(opts.limit ?? 50, 50);

    // Use search API to find recent videos
    const params = new URLSearchParams({
      part: 'snippet',
      channelId: account.providerAccountId,
      type: 'video',
      order: 'date',
      maxResults: String(limit),
    });
    if (opts.cursor) params.set('pageToken', opts.cursor);

    const res = await fetch(`${this.apiBaseUrl}/search?${params}`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) throw new StudioAuthError('youtube', 'Access token expired.');
      if (res.status === 403) throw new StudioAuthError('youtube', 'API quota exceeded.');
      throw new OAuthCallbackFailedError('youtube', `Content fetch failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      items: YouTubeSearchResult[];
      nextPageToken?: string;
    };

    // Fetch video statistics in batch
    const videoIds = data.items.map((i) => i.id.videoId).filter(Boolean) as string[];
    const videoStats = videoIds.length > 0 ? await this.fetchVideoStats(videoIds, account.accessToken) : new Map<string, YouTubeVideo>();

    const items: ProviderContentItem[] = data.items
      .filter((item) => item.id.videoId)
      .map((item) => {
        const video = videoStats.get(item.id.videoId!);
        const viewCount = video?.statistics?.viewCount ? parseInt(video.statistics.viewCount, 10) : 0;
        const likeCount = video?.statistics?.likeCount ? parseInt(video.statistics.likeCount, 10) : 0;
        const commentCount = video?.statistics?.commentCount ? parseInt(video.statistics.commentCount, 10) : 0;
        const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

        return {
          providerContentId: item.id.videoId!,
          type: 'video' as ContentType,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnailUrl: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? null,
          contentUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          publishedAt: new Date(item.snippet.publishedAt),
          durationSeconds: video?.contentDetails?.duration ? this.parseDuration(video.contentDetails.duration) : null,
          viewCount,
          likeCount,
          commentCount,
          shareCount: 0,
          engagementRate: Math.round(engagementRate * 100) / 100,
          tags: video?.snippet?.tags ?? [],
          metadata: { categoryId: video?.snippet?.categoryId },
        };
      });

    return {
      items,
      nextCursor: data.nextPageToken ?? null,
      hasMore: !!data.nextPageToken,
    };
  }

  private async fetchVideoStats(videoIds: string[], accessToken: string): Promise<Map<string, YouTubeVideo>> {
    const params = new URLSearchParams({
      part: 'statistics,snippet,contentDetails',
      id: videoIds.join(','),
    });
    const res = await fetch(`${this.apiBaseUrl}/videos?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return new Map();
    const data = (await res.json()) as { items: YouTubeVideo[] };
    return new Map(data.items.map((v) => [v.id, v]));
  }

  async fetchMetrics(account: { providerAccountId: string; accessToken: string }): Promise<ProviderMetricsSnapshot | null> {
    this.requireConfigured();
    // Fetch channel statistics again for the latest counts
    const params = new URLSearchParams({
      part: 'statistics',
      id: account.providerAccountId,
    });
    const res = await fetch(`${this.apiBaseUrl}/channels?${params}`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { items?: YouTubeChannel[] };
    const channel = data.items?.[0];
    if (!channel) return null;

    return {
      snapshotDate: new Date(),
      followerCount: channel.statistics.hiddenSubscriberCount ? 0 : parseInt(channel.statistics.subscriberCount, 10) || 0,
      followingCount: 0,
      totalViews: parseInt(channel.statistics.viewCount, 10) || 0,
      totalPosts: parseInt(channel.statistics.videoCount, 10) || 0,
      newFollowers: 0, // requires analytics API
      newViews: 0,
      newPosts: 0,
      avgEngagementRate: 0,
      estimatedReach: 0,
      metadata: { raw: channel.statistics },
    };
  }

  async fetchAudience(account: { providerAccountId: string; accessToken: string }): Promise<ProviderAudienceSegment[]> {
    this.requireConfigured();
    // YouTube Analytics API requires a separate endpoint and specific date ranges.
    // This is a stub that returns empty — real implementation would call:
    // GET https://youtubeanalytics.googleapis.com/v2/reports
    //   ?ids=channel==MINE
    //   &metrics=subscribersGained
    //   &dimensions=country
    //   &startDate=...
    //   &endDate=...
    return [];
  }

  // ===== State management =====

  private generateState(workspaceId: string, userId: string): string {
    // Simple state encoding: base64(workspaceId:userId:random)
    // In production, this should be a signed JWT or stored in a DB table
    const random = Math.random().toString(36).slice(2, 10);
    const payload = `${workspaceId}:${userId}:${random}`;
    return Buffer.from(payload).toString('base64url');
  }

  private verifyState(state: string): { workspaceId: string; userId: string } {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf8');
      const [workspaceId, userId] = decoded.split(':');
      if (!workspaceId || !userId) throw new Error('Invalid state');
      return { workspaceId, userId };
    } catch {
      throw new OAuthCallbackFailedError('youtube', 'Invalid OAuth state. Please retry the connection.');
    }
  }

  private parseDuration(isoDuration: string): number {
    // Parse ISO 8601 duration (e.g. PT1H2M3S) into seconds
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] ?? '0', 10);
    const minutes = parseInt(match[2] ?? '0', 10);
    const seconds = parseInt(match[3] ?? '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
}
