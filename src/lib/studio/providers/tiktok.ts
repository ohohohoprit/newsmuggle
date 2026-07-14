/**
 * TikTok social provider — stub for future implementation.
 *
 * This provider is registered but marked as unavailable. When TikTok
 * API credentials are added, implement the methods following the same
 * pattern as YouTubeProvider / InstagramProvider.
 *
 * Environment variables (to be set later):
 *   - TIKTOK_CLIENT_ID
 *   - TIKTOK_CLIENT_SECRET
 */
import type {
  SocialProviderSlug,
  OAuthInitResult,
  ProviderAccountProfile,
  ProviderContentItem,
  ProviderMetricsSnapshot,
  ProviderAudienceSegment,
} from '@/lib/studio/types';
import { SocialProvider, type OAuthCallbackResult, type SyncOptions } from '@/lib/studio/providers/base';
import { ProviderNotAvailableError } from '@/lib/studio/errors';

export class TikTokProvider extends SocialProvider {
  readonly slug: SocialProviderSlug = 'tiktok';
  readonly name = 'TikTok';
  protected readonly clientIdEnvVar = 'TIKTOK_CLIENT_ID';
  protected readonly clientSecretEnvVar = 'TIKTOK_CLIENT_SECRET';
  protected readonly oauthScopes = [
    'user.info.basic',
    'video.list',
    'video.upload',
  ];

  isAvailable(): boolean {
    return false; // not yet implemented
  }

  buildAuthUrl(_workspaceId: string, _userId: string): OAuthInitResult {
    throw new ProviderNotAvailableError('tiktok');
  }

  async exchangeCodeForTokens(_code: string, _state: string): Promise<OAuthCallbackResult> {
    throw new ProviderNotAvailableError('tiktok');
  }

  async refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null } | null> {
    throw new ProviderNotAvailableError('tiktok');
  }

  async fetchProfile(): Promise<ProviderAccountProfile> {
    throw new ProviderNotAvailableError('tiktok');
  }

  async fetchContent(): Promise<{ items: ProviderContentItem[]; nextCursor: string | null; hasMore: boolean }> {
    throw new ProviderNotAvailableError('tiktok');
  }

  async fetchMetrics(): Promise<ProviderMetricsSnapshot | null> {
    throw new ProviderNotAvailableError('tiktok');
  }

  async fetchAudience(): Promise<ProviderAudienceSegment[]> {
    throw new ProviderNotAvailableError('tiktok');
  }
}
