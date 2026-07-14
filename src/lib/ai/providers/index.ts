/**
 * Provider registry — singleton instances of all providers.
 *
 * The registry is process-wide (module-level). Providers are instantiated
 * once and reused. New providers can be added by:
 *   1. Creating a class that extends BaseAIProvider (or OpenAIProvider)
 *   2. Adding it to the `ALL_PROVIDERS` array below
 *
 * No other file needs to change — the router, service, and tool engine
 * all read from this registry dynamically.
 */
import type { AIProvider, AIProviderSlug, AIProviderInfo } from '@/lib/ai/types';
import { ZAIProvider } from '@/lib/ai/providers/zai';
import { OpenAIProvider } from '@/lib/ai/providers/openai';
import { ClaudeProvider } from '@/lib/ai/providers/claude';
import { GeminiProvider } from '@/lib/ai/providers/gemini';
import { GrokProvider } from '@/lib/ai/providers/grok';
import { DeepSeekProvider } from '@/lib/ai/providers/deepseek';

// ===== Singleton instances =====

const providerInstances: AIProvider[] = [
  new ZAIProvider(),
  new OpenAIProvider(),
  new ClaudeProvider(),
  new GeminiProvider(),
  new GrokProvider(),
  new DeepSeekProvider(),
];

const providerMap = new Map<AIProviderSlug, AIProvider>(
  providerInstances.map((p) => [p.slug, p]),
);

// ===== Public API =====

/** Get a provider by slug. Throws if unknown. */
export function getProvider(slug: AIProviderSlug): AIProvider {
  const provider = providerMap.get(slug);
  if (!provider) {
    throw new Error(`Unknown AI provider: ${slug}`);
  }
  return provider;
}

/** Get all registered providers (including unavailable ones). */
export function getAllProviders(): AIProvider[] {
  return providerInstances;
}

/** Get all available providers (configured with API keys). */
export function getAvailableProviders(): AIProvider[] {
  return providerInstances.filter((p) => p.isAvailable());
}

/** Get provider info for admin UI / capability discovery. */
export function getProviderInfos(): AIProviderInfo[] {
  return providerInstances.map((p) => ({
    slug: p.slug,
    name: p.name,
    available: p.isAvailable(),
    defaultModel: p.getDefaultModel(),
    models: p.getModels(),
    supportsStreaming: p.getModels().some((m) => m.supportsStreaming),
    supportsThinking: p.slug === 'zai' || p.slug === 'claude' || p.slug === 'deepseek',
  }));
}

/** Check if a provider slug is registered. */
export function isKnownProvider(slug: string): slug is AIProviderSlug {
  return providerMap.has(slug as AIProviderSlug);
}
