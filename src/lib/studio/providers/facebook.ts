/**
 * Facebook social provider — stub for future implementation.
 *
 * This provider is registered but marked as unavailable. When Facebook
 * Graph API credentials are added, implement the methods following the
 * same pattern as YouTubeProvider / InstagramProvider.
 *
 * Environment variables (to be set later):
 *   - FACEBOOK_CLIENT_ID
 *   - FACEBOOK_CLIENT_SECRET
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

export class FacebookProvider extends SocialProvider {
  readonly slug: SocialProviderSlug = 'facebook';
  readonly name = 'Facebook';
  protected readonly clientIdEnvVar = 'FACEBOOK_CLIENT_ID';
  protected readonly clientSecretEnvVar = 'FACEBOOK_CLIENT_SECRET';
  protected readonly oauthScopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_read_user_content',
    'pages_manage_posts',
    'read_insights',
  ];

  isAvailable(): boolean {
    return false; // not yet implemented
  }

  buildAuthUrl(_workspaceId: string, _userId: string): OAuthInitResult {
    throw new ProviderNotAvailableError('facebook');
  }

  async exchangeCodeForTokens(_code: string, _state: string): Promise<OAuthCallbackResult> {
    throw new ProviderNotAvailableError('facebook');
  }

  async refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null } | null> {
    throw new ProviderNotAvailableError('facebook');
  }

  async fetchProfile(): Promise<ProviderAccountProfile> {
    throw new ProviderNotAvailableError('facebook');
  }

  async fetchContent(): Promise<{ items: ProviderContentItem[]; nextCursor: string | null; hasMore: boolean }> {
    throw new ProviderNotAvailableError('facebook');
  }

  async fetchMetrics(): Promise<ProviderMetricsSnapshot | null> {
    throw new ProviderNotAvailableError('facebook');
  }

  async fetchAudience(): Promise<ProviderAudienceSegment[]> {
    throw new ProviderNotAvailableError('facebook');
  }
}
