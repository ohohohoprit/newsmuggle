/**
 * Instagram social provider — implements the SocialProvider interface
 * using the Instagram Graph API (via Facebook Graph API).
 *
 * Environment variables required:
 *   - INSTAGRAM_CLIENT_ID       (Facebook App ID)
 *   - INSTAGRAM_CLIENT_SECRET   (Facebook App Secret)
 *
 * API endpoints used:
 *   - https://api.instagram.com/oauth/authorize          (OAuth)
 *   - https://api.instagram.com/oauth/access_token        (token exchange)
 *   - https://graph.instagram.com/v21.0/me                (profile)
 *   - https://graph.instagram.com/v21.0/me/media          (content)
 *   - https://graph.instagram.com/v21.0/me/insights        (analytics)
 *
 * NOTE: This provider is fully implemented but will return
 * ProviderNotConfiguredError until the env vars are set.
 */
import type {
  SocialProviderSlug,
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

interface InstagramTokenResponse {
  access_token: string;
  user_id: number;
  expires_in?: number;
}

interface InstagramLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InstagramProfile {
  id: string;
  username: string;
  name: string;
  account_type: string;
  profile_picture_url?: string;
  biography?: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  is_verified?: boolean;
}

interface InstagramMedia {
  id: string;
  caption: string;
  media_type: string; // IMAGE | VIDEO | CAROUSEL_ALBUM | REELS
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export class InstagramProvider extends SocialProvider {
  readonly slug: SocialProviderSlug = 'instagram';
  readonly name = 'Instagram';
  protected readonly clientIdEnvVar = 'INSTAGRAM_CLIENT_ID';
  protected readonly clientSecretEnvVar = 'INSTAGRAM_CLIENT_SECRET';
  protected readonly oauthScopes = [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'instagram_manage_comments',
    'pages_show_list',
  ];

  private get authBaseUrl(): string {
    return 'https://api.instagram.com/oauth/authorize';
  }

  private get tokenUrl(): string {
    return 'https://api.instagram.com/oauth/access_token';
  }

  private get graphBaseUrl(): string {
    return 'https://graph.instagram.com/v21.0';
  }

  isAvailable(): boolean {
    return true;
  }

  private requireConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError('instagram');
    }
  }

  buildAuthUrl(workspaceId: string, userId: string): OAuthInitResult {
    this.requireConfigured();
    const state = this.generateState(workspaceId, userId);
    const params = new URLSearchParams({
      client_id: this.getClientId()!,
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      scope: this.oauthScopes.join(','),
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

    // Exchange code for short-lived token
    const formData = new FormData();
    formData.append('client_id', this.getClientId()!);
    formData.append('client_secret', this.getClientSecret()!);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', this.getRedirectUri());
    formData.append('code', code);

    const tokenRes = await fetch(this.tokenUrl, {
      method: 'POST',
      body: formData,
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '');
      throw new OAuthCallbackFailedError('instagram', `Token exchange failed: ${errText}`);
    }

    const tokens = (await tokenRes.json()) as InstagramTokenResponse;

    // Exchange for long-lived token
    const longLivedRes = await fetch(
      `${this.graphBaseUrl}/access_token?${new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: this.getClientSecret()!,
        access_token: tokens.access_token,
      })}`,
    );

    let longLivedToken = tokens.access_token;
    let expiresIn = tokens.expires_in ?? 3600;
    if (longLivedRes.ok) {
      const longLived = (await longLivedRes.json()) as InstagramLongLivedTokenResponse;
      longLivedToken = longLived.access_token;
      expiresIn = longLived.expires_in;
    }

    // Fetch profile
    const profile = await this.fetchProfileWithToken(longLivedToken);

    return {
      profile: {
        ...profile,
        accessToken: longLivedToken,
        refreshToken: null, // Instagram uses long-lived tokens, no refresh token
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        tokenScope: this.oauthScopes,
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
    if (!account.accessToken) return null;

    // Refresh long-lived token
    const res = await fetch(
      `${this.graphBaseUrl}/refresh_access_token?${new URLSearchParams({
        grant_type: 'ig_refresh_token',
        access_token: account.accessToken,
      })}`,
    );

    if (!res.ok) {
      throw new StudioAuthError('instagram', 'Token refresh failed. Please reconnect the account.');
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
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
    const fields = 'id,username,name,account_type,profile_picture_url,biography,followers_count,follows_count,media_count,is_verified';
    const res = await fetch(
      `${this.graphBaseUrl}/me?fields=${fields}&access_token=${accessToken}`,
    );

    if (!res.ok) {
      if (res.status === 401) throw new StudioAuthError('instagram', 'Access token expired or invalid.');
      throw new OAuthCallbackFailedError('instagram', `Profile fetch failed: ${res.status}`);
    }

    const profile = (await res.json()) as InstagramProfile;

    return {
      providerAccountId: profile.id,
      handle: `@${profile.username}`,
      displayName: profile.name,
      avatar: profile.profile_picture_url ?? null,
      description: profile.biography ?? null,
      accountType: (profile.account_type?.toLowerCase() ?? 'personal') as AccountType,
      followerCount: profile.followers_count ?? 0,
      followingCount: profile.follows_count ?? 0,
      totalViews: 0, // Instagram doesn't expose total views
      totalPosts: profile.media_count ?? 0,
      isVerified: profile.is_verified ?? false,
      accessToken: '',
      refreshToken: null,
      tokenExpiresAt: null,
      tokenScope: [],
      metadata: { username: profile.username, accountType: profile.account_type },
    };
  }

  async fetchContent(
    account: { providerAccountId: string; accessToken: string },
    opts: SyncOptions,
  ): Promise<{ items: ProviderContentItem[]; nextCursor: string | null; hasMore: boolean }> {
    this.requireConfigured();
    const limit = Math.min(opts.limit ?? 50, 50);

    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
    const params = new URLSearchParams({
      fields,
      limit: String(limit),
      access_token: account.accessToken,
    });
    if (opts.cursor) params.set('after', opts.cursor);

    const res = await fetch(
      `${this.graphBaseUrl}/me/media?${params}`,
    );

    if (!res.ok) {
      if (res.status === 401) throw new StudioAuthError('instagram', 'Access token expired.');
      if (res.status === 429) throw new StudioAuthError('instagram', 'API rate limit exceeded.');
      throw new OAuthCallbackFailedError('instagram', `Content fetch failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      data: InstagramMedia[];
      paging?: { cursors: { before: string; after: string }; next?: string };
    };

    const items: ProviderContentItem[] = data.data.map((media) => {
      const likeCount = media.like_count ?? 0;
      const commentCount = media.comments_count ?? 0;
      const engagementRate = likeCount + commentCount > 0 ? ((likeCount + commentCount) / Math.max(1, 1)) * 100 : 0;

      return {
        providerContentId: media.id,
        type: this.mapMediaType(media.media_type),
        title: media.caption?.split('\n')[0]?.slice(0, 100) ?? null,
        description: media.caption ?? null,
        thumbnailUrl: media.thumbnail_url ?? media.media_url ?? null,
        contentUrl: media.permalink,
        publishedAt: new Date(media.timestamp),
        durationSeconds: null,
        viewCount: 0, // Instagram doesn't expose views for most content
        likeCount,
        commentCount,
        shareCount: 0,
        engagementRate: Math.round(engagementRate * 100) / 100,
        tags: this.extractHashtags(media.caption),
        metadata: { mediaType: media.media_type },
      };
    });

    return {
      items,
      nextCursor: data.paging?.cursors.after ?? null,
      hasMore: !!data.paging?.next,
    };
  }

  async fetchMetrics(account: { providerAccountId: string; accessToken: string }): Promise<ProviderMetricsSnapshot | null> {
    this.requireConfigured();
    // Fetch profile again for the latest counts
    const fields = 'followers_count,follows_count,media_count';
    const res = await fetch(
      `${this.graphBaseUrl}/me?fields=${fields}&access_token=${account.accessToken}`,
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { followers_count: number; follows_count: number; media_count: number };

    return {
      snapshotDate: new Date(),
      followerCount: data.followers_count ?? 0,
      followingCount: data.follows_count ?? 0,
      totalViews: 0,
      totalPosts: data.media_count ?? 0,
      newFollowers: 0,
      newViews: 0,
      newPosts: 0,
      avgEngagementRate: 0,
      estimatedReach: 0,
      metadata: { raw: data },
    };
  }

  async fetchAudience(account: { providerAccountId: string; accessToken: string }): Promise<ProviderAudienceSegment[]> {
    this.requireConfigured();
    // Instagram insights API for audience demographics
    // GET /me/insights?metric=audience_country,audience_city,audience_gender_age
    const params = new URLSearchParams({
      metric: 'audience_country,audience_city,audience_gender_age',
      access_token: account.accessToken,
    });
    const res = await fetch(`${this.graphBaseUrl}/me/insights?${params}`);
    if (!res.ok) return [];

    const data = (await res.json()) as {
      data: Array<{
        name: string;
        values: Array<{ value: Record<string, number> }>;
      }>;
    };

    const segments: ProviderAudienceSegment[] = [];
    const now = new Date();

    for (const insight of data.data ?? []) {
      const values = insight.values?.[0]?.value ?? {};
      for (const [key, count] of Object.entries(values)) {
        if (insight.name === 'audience_gender_age') {
          // key format: "18-24" or "M.18-24" or "F.25-34"
          const match = key.match(/^([MF])?\.?(\d+-\d+)$/);
          if (match) {
            const gender = match[1] ? (match[1] === 'M' ? 'male' : 'female') : null;
            const ageRange = match[2];
            segments.push({
              snapshotDate: now,
              ageRange,
              gender,
              country: null,
              city: null,
              percentage: 0,
              count,
              metadata: { source: 'insights' },
            });
          }
        } else if (insight.name === 'audience_country') {
          segments.push({
            snapshotDate: now,
            ageRange: null,
            gender: null,
            country: key,
            city: null,
            percentage: 0,
            count,
            metadata: { source: 'insights' },
          });
        }
      }
    }

    return segments;
  }

  // ===== Helpers =====

  private mapMediaType(mediaType: string): ContentType {
    switch (mediaType) {
      case 'VIDEO': return 'video';
      case 'REELS': return 'reel';
      case 'CAROUSEL_ALBUM': return 'post';
      case 'IMAGE': return 'post';
      case 'STORY': return 'story';
      default: return 'post';
    }
  }

  private extractHashtags(caption?: string): string[] {
    if (!caption) return [];
    const matches = caption.match(/#[\w]+/g);
    return matches ?? [];
  }

  private generateState(workspaceId: string, userId: string): string {
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
      throw new OAuthCallbackFailedError('instagram', 'Invalid OAuth state. Please retry the connection.');
    }
  }
}
