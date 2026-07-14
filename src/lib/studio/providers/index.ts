/**
 * Studio provider registry — singleton instances of all social providers.
 *
 * Adding a future provider = create a class extending SocialProvider +
 * add to the `providerInstances` array. No other file changes.
 */
import type { SocialProviderSlug, ProviderInfo } from '@/lib/studio/types';
import { SocialProvider } from '@/lib/studio/providers/base';
import { YouTubeProvider } from '@/lib/studio/providers/youtube';
import { InstagramProvider } from '@/lib/studio/providers/instagram';
import { FacebookProvider } from '@/lib/studio/providers/facebook';
import { TikTokProvider } from '@/lib/studio/providers/tiktok';

// ===== Singleton instances =====

const providerInstances: SocialProvider[] = [
  new YouTubeProvider(),
  new InstagramProvider(),
  new FacebookProvider(),
  new TikTokProvider(),
];

const providerMap = new Map<SocialProviderSlug, SocialProvider>(
  providerInstances.map((p) => [p.slug, p]),
);

// ===== Public API =====

/** Get a provider by slug. Throws if unknown. */
export function getProvider(slug: SocialProviderSlug): SocialProvider {
  const provider = providerMap.get(slug);
  if (!provider) {
    throw new Error(`Unknown social provider: ${slug}`);
  }
  return provider;
}

/** Get all registered providers (including unavailable ones). */
export function getAllProviders(): SocialProvider[] {
  return providerInstances;
}

/** Get all available providers (implemented + configured). */
export function getAvailableProviders(): SocialProvider[] {
  return providerInstances.filter((p) => p.isAvailable());
}

/** Get provider info for API capability discovery. */
export function getProviderInfos(): ProviderInfo[] {
  return providerInstances.map((p) => p.getInfo());
}

/** Check if a provider slug is registered. */
export function isKnownProvider(slug: string): slug is SocialProviderSlug {
  return providerMap.has(slug as SocialProviderSlug);
}
