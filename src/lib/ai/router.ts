/**
 * AI Router — resolves which provider + model to use for a given request.
 *
 * Selection precedence (highest to lowest):
 *   1. Per-request override (req.provider / req.model)
 *   2. Tool-level default (from ToolDefinition.modelConfig)
 *   3. Environment default (AI_DEFAULT_PROVIDER / AI_DEFAULT_MODEL)
 *   4. First available provider's default model
 *
 * The router NEVER calls the provider — it only returns the resolved
 * provider + model. The AI service does the actual call.
 */
import type { AIProvider, AIProviderSlug } from '@/lib/ai/types';
import { getProvider, getAvailableProviders, isKnownProvider } from '@/lib/ai/providers';
import { AIUnavailableError } from '@/lib/ai/errors';
import type { ModelConfig } from '@/lib/tools/types';

// ===== Environment defaults =====

function getEnvDefaultProvider(): AIProviderSlug | null {
  const raw = process.env.AI_DEFAULT_PROVIDER?.trim().toLowerCase();
  if (!raw) return null;
  if (!isKnownProvider(raw)) {
    console.warn(`[ai/router] AI_DEFAULT_PROVIDER="${raw}" is not a known provider, ignoring.`);
    return null;
  }
  return raw as AIProviderSlug;
}

function getEnvDefaultModel(): string | null {
  const raw = process.env.AI_DEFAULT_MODEL?.trim();
  return raw || null;
}

// ===== Public API =====

export interface ResolvedProvider {
  provider: AIProvider;
  providerSlug: AIProviderSlug;
  model: string;
  /** Where the resolution came from (for debugging/auditing). */
  source: 'request' | 'tool' | 'env' | 'fallback';
}

/**
 * Resolve the provider + model for a generation request.
 *
 * @param requestProvider  per-request override (from AIGenerateRequest.provider)
 * @param requestModel     per-request override (from AIGenerateRequest.model)
 * @param toolConfig       tool-level default (from ToolDefinition.modelConfig)
 */
export function resolveProvider(
  requestProvider?: AIProviderSlug,
  requestModel?: string,
  toolConfig?: ModelConfig | null,
): ResolvedProvider {
  // 1. Per-request override (highest priority)
  if (requestProvider && isKnownProvider(requestProvider)) {
    const provider = getProvider(requestProvider);
    if (provider.isAvailable()) {
      return {
        provider,
        providerSlug: requestProvider,
        model: requestModel ?? toolConfig?.model ?? provider.getDefaultModel(),
        source: 'request',
      };
    }
    // Requested a specific provider but it's unavailable — fall through
    // with a warning rather than hard-failing, so the tool still runs.
    console.warn(`[ai/router] Requested provider "${requestProvider}" is unavailable, falling back.`);
  }

  // 2. Tool-level default
  if (toolConfig && toolConfig.provider && isKnownProvider(toolConfig.provider)) {
    const provider = getProvider(toolConfig.provider);
    if (provider.isAvailable()) {
      return {
        provider,
        providerSlug: toolConfig.provider,
        model: requestModel ?? (toolConfig.model && toolConfig.model !== 'default' ? toolConfig.model : provider.getDefaultModel()),
        source: 'tool',
      };
    }
  }

  // 3. Environment default
  const envProvider = getEnvDefaultProvider();
  if (envProvider) {
    const provider = getProvider(envProvider);
    if (provider.isAvailable()) {
      return {
        provider,
        providerSlug: envProvider,
        model: getEnvDefaultModel() ?? provider.getDefaultModel(),
        source: 'env',
      };
    }
  }

  // 4. Fallback: first available provider
  const available = getAvailableProviders();
  if (available.length === 0) {
    throw new AIUnavailableError(
      'No AI provider is configured. Set at least one provider API key (e.g. ZAI_API_KEY, OPENAI_API_KEY).',
    );
  }
  const fallback = available[0];
  return {
    provider: fallback,
    providerSlug: fallback.slug,
    model: fallback.getDefaultModel(),
    source: 'fallback',
  };
}

/**
 * Get the effective ModelConfig to persist on the ToolExecution row.
 * This reflects what was ACTUALLY used, not what was requested.
 */
export function effectiveModelConfig(resolved: ResolvedProvider): ModelConfig {
  return {
    provider: resolved.providerSlug,
    model: resolved.model,
    temperature: 0.8, // temperature is request-scoped, not provider-scoped
  };
}
