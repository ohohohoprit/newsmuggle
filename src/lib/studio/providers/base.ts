/**
 * Base social provider — defines the connector interface that all
 * social platform providers (YouTube, Instagram, Facebook, TikTok) must implement.
 *
 * Concrete providers extend this class and implement the methods. The
 * studio service selects the provider by slug from the registry.
 *
 * Each provider handles:
 *   - OAuth flow initiation (buildAuthUrl)
 *   - OAuth callback handling (exchangeCodeForTokens)
 *   - Profile fetching (fetchProfile)
 *   - Content fetching (fetchContent)
 *   - Metrics fetching (fetchMetrics)
 *   - Audience demographics (fetchAudience)
 *   - Token refresh (refreshAccessToken)
 *
 * Future providers (Facebook, TikTok) can be added by extending this
 * class and registering in the providers/index.ts — no changes to the
 * studio service or API routes.
 */
import type {
  SocialProviderSlug,
  ProviderInfo,
  OAuthInitResult,
  ProviderAccountProfile,
  ProviderContentItem,
  ProviderMetricsSnapshot,
  ProviderAudienceSegment,
  ProviderSyncResult,
} from '@/lib/studio/types';

export interface SyncOptions {
  cursor?: string | null;
  limit?: number;
  since?: Date;
  until?: Date;
  includeContent?: boolean;
  includeMetrics?: boolean;
  includeAudience?: boolean;
}

export interface OAuthCallbackResult {
  profile: ProviderAccountProfile;
}

export abstract class SocialProvider {
  abstract readonly slug: SocialProviderSlug;
  abstract readonly name: string;

  /** Environment variable names for OAuth credentials. */
  protected abstract readonly clientIdEnvVar: string;
  protected abstract readonly clientSecretEnvVar: string;

  /** OAuth scopes this provider requests. */
  protected abstract readonly oauthScopes: string[];

  /** Whether this provider is fully implemented (vs. stub for future). */
  abstract isAvailable(): boolean;

  /** Whether the provider is configured (has OAuth credentials). */
  isConfigured(): boolean {
    return !!(process.env[this.clientIdEnvVar] && process.env[this.clientSecretEnvVar]);
  }

  /** Get provider info for the API. */
  getInfo(): ProviderInfo {
    return {
      slug: this.slug,
      name: this.name,
      available: this.isAvailable(),
      configured: this.isConfigured(),
      supportsOAuth: true,
      supportsContent: true,
      supportsMetrics: true,
      supportsAudience: true,
      oauthScopes: this.oauthScopes,
      authUrlEnvVar: this.clientIdEnvVar,
    };
  }

  protected getClientId(): string | undefined {
    return process.env[this.clientIdEnvVar];
  }

  protected getClientSecret(): string | undefined {
    return process.env[this.clientSecretEnvVar];
  }

  protected getRedirectUri(): string {
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000';
    return `${baseUrl}/api/studio/connect/${this.slug}/callback`;
  }

  /**
   * Build the OAuth authorization URL for the user to visit.
   * Returns the URL + a state token that must be verified in the callback.
   */
  abstract buildAuthUrl(workspaceId: string, userId: string): OAuthInitResult;

  /**
   * Exchange the OAuth code for access + refresh tokens, then fetch
   * the account profile.
   */
  abstract exchangeCodeForTokens(code: string, state: string): Promise<OAuthCallbackResult>;

  /**
   * Refresh the access token using the refresh token (if supported).
   * Returns the new tokens or null if refresh isn't possible.
   */
  abstract refreshAccessToken(account: {
    providerAccountId: string;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
  }): Promise<{ accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null } | null>;

  /**
   * Fetch the account profile from the provider.
   */
  abstract fetchProfile(account: {
    providerAccountId: string;
    accessToken: string;
    refreshToken: string | null;
  }): Promise<ProviderAccountProfile>;

  /**
   * Fetch recent content (videos, posts, reels) from the provider.
   * Uses the cursor for incremental sync.
   */
  abstract fetchContent(account: {
    providerAccountId: string;
    accessToken: string;
  }, opts: SyncOptions): Promise<{ items: ProviderContentItem[]; nextCursor: string | null; hasMore: boolean }>;

  /**
   * Fetch the current metrics snapshot for the account.
   */
  abstract fetchMetrics(account: {
    providerAccountId: string;
    accessToken: string;
  }): Promise<ProviderMetricsSnapshot | null>;

  /**
   * Fetch audience demographics for the account.
   */
  abstract fetchAudience(account: {
    providerAccountId: string;
    accessToken: string;
  }): Promise<ProviderAudienceSegment[]>;

  /**
   * Full sync: profile + content + metrics + audience in one call.
   * Default implementation calls the individual methods. Providers can
   * override for optimization.
   */
  async sync(account: {
    providerAccountId: string;
    accessToken: string;
    refreshToken: string | null;
  }, opts: SyncOptions): Promise<ProviderSyncResult> {
    const includeContent = opts.includeContent ?? true;
    const includeMetrics = opts.includeMetrics ?? true;
    const includeAudience = opts.includeAudience ?? true;

    const [profile, contentResult, metrics, audience] = await Promise.all([
      this.fetchProfile(account),
      includeContent ? this.fetchContent(account, opts) : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
      includeMetrics ? this.fetchMetrics(account) : Promise.resolve(null),
      includeAudience ? this.fetchAudience(account) : Promise.resolve([]),
    ]);

    return {
      profile,
      content: contentResult.items,
      metrics,
      audience,
      nextCursor: contentResult.nextCursor,
      hasMore: contentResult.hasMore,
    };
  }
}
