/**
 * Unified AI Service — the single entry point for all AI generation.
 *
 * Responsibilities:
 *   1. Receive a generation request (from the tool engine or any caller).
 *   2. Select the provider + model via the router.
 *   3. Build the provider-specific request (handled by the provider).
 *   4. Execute the generation with automatic retries + exponential backoff.
 *   5. Normalize the response into the unified AIGenerateResponse format.
 *   6. Normalize errors into the AIServiceError hierarchy.
 *   7. Track usage (tokens, cost, latency, retries) — persisted by the caller.
 *
 * The tool engine calls `aiService.generate()` instead of touching any
 * provider SDK directly. New providers can be added without modifying
 * this service or the tool engine.
 *
 * Streaming is designed-in: the `generateStream()` method exists now
 * (forwards to the provider's streaming implementation if available)
 * so it can be wired into the tool engine later without API changes.
 */
import type {
  AIGenerateRequest,
  AIGenerateResponse,
  AICallOptions,
  AIProviderSlug,
  AIStreamChunk,
  AIUsage,
  AICost,
} from '@/lib/ai/types';
import { DEFAULT_RETRY_CONFIG } from '@/lib/ai/types';
import type { AIRetryConfig } from '@/lib/ai/types';
import { resolveProvider } from '@/lib/ai/router';
import {
  AIServiceError,
  AIUnavailableError,
  AIRateLimitError,
  AITimeoutError,
  normalizeError,
} from '@/lib/ai/errors';
import type { ModelConfig } from '@/lib/tools/types';

// ===== Singleton =====

class AIService {
  private retryConfig: AIRetryConfig = DEFAULT_RETRY_CONFIG;

  /** Override the default retry config (e.g. for tests). */
  setRetryConfig(config: Partial<AIRetryConfig>): void {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Generate a completion. This is the main entry point.
   *
   * The caller may optionally pass a `toolConfig` (from the ToolDefinition)
   * so the router can use the tool's default provider/model when no
   * per-request override is provided.
   */
  async generate(
    req: AIGenerateRequest,
    opts: AICallOptions & { toolConfig?: ModelConfig | null } = {},
  ): Promise<AIGenerateResponse> {
    const { toolConfig, ...callOpts } = opts;

    // 1. Resolve provider + model
    const resolved = resolveProvider(req.provider, req.model, toolConfig ?? null);

    // 2. Execute with retries
    const maxRetries = callOpts.maxRetries ?? this.retryConfig.maxRetries;
    let lastError: AIServiceError | null = null;
    let attempt = 0;

    for (attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await resolved.provider.generate(
          { ...req, provider: resolved.providerSlug, model: resolved.model },
          {
            ...callOpts,
            maxRetries: 0, // provider itself doesn't retry; we handle it here
          },
        );

        // Attach retry count + resolution source
        return {
          ...response,
          provider: resolved.providerSlug,
          model: resolved.model,
          retries: attempt,
        };
      } catch (err) {
        const normalized = err instanceof AIServiceError
          ? err
          : normalizeError(err, resolved.providerSlug, resolved.model);

        lastError = normalized;

        // Check if we should retry
        const shouldRetry = attempt < maxRetries && this.isRetryable(normalized);
        if (!shouldRetry) {
          break;
        }

        // Wait with exponential backoff before retrying
        const delay = this.computeBackoff(attempt, normalized);
        await this.sleep(delay);
      }
    }

    // All retries exhausted — throw the last error
    throw lastError ?? new AIUnavailableError('AI generation failed for unknown reasons.');
  }

  /**
   * Stream a completion. Returns an async generator that yields text
   * chunks, then the final response. If the provider doesn't support
   * streaming, falls back to non-streaming and yields the full content
   * as a single chunk.
   *
   * NOTE: Not yet wired into the tool engine. Designed now so it can be
   * added later without changing the engine's interface.
   */
  async *generateStream(
    req: AIGenerateRequest,
    opts: AICallOptions & { toolConfig?: ModelConfig | null } = {},
  ): AsyncGenerator<AIStreamChunk, AIGenerateResponse, unknown> {
    const { toolConfig, ...callOpts } = opts;
    const resolved = resolveProvider(req.provider, req.model, toolConfig ?? null);

    if (typeof resolved.provider.generateStream === 'function') {
      // Provider supports native streaming
      const gen = resolved.provider.generateStream(
        { ...req, provider: resolved.providerSlug, model: resolved.model },
        callOpts,
      );
      let final: AIGenerateResponse | null = null;
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          final = value as AIGenerateResponse;
          break;
        }
        yield value as AIStreamChunk;
      }
      if (!final) {
        throw new AIServiceError('INTERNAL_ERROR', 'Stream ended without final response.');
      }
      return { ...final, provider: resolved.providerSlug, model: resolved.model };
    }

    // Fallback: non-streaming, yield full content as one chunk
    const response = await this.generate(req, opts);
    yield { delta: response.content, done: false };
    yield { delta: '', done: true };
    return response;
  }

  // ===== Internal helpers =====

  private isRetryable(err: AIServiceError): boolean {
    if (!err.retryable) return false;
    if (this.retryConfig.retryableErrors.includes(err.code)) return true;
    if (err.meta.status && this.retryConfig.retryableStatuses.includes(err.meta.status)) return true;
    return false;
  }

  private computeBackoff(attempt: number, err: AIServiceError): number {
    // Respect Retry-After header for rate limit errors if present
    if (err instanceof AIRateLimitError && err.meta.retryAfterMs) {
      return Math.min(err.meta.retryAfterMs, this.retryConfig.maxDelayMs);
    }
    const base = this.retryConfig.initialDelayMs;
    const delay = base * Math.pow(this.retryConfig.backoffFactor, attempt);
    // Add jitter (±25%) to avoid thundering herd
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.min(Math.max(0, delay + jitter), this.retryConfig.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ===== Export singleton =====

export const aiService = new AIService();

// Re-export types for convenience
export type { AIGenerateRequest, AIGenerateResponse, AIUsage, AICost, AIProviderSlug } from '@/lib/ai/types';
export { AIServiceError, AIUnavailableError, AIRateLimitError, AITimeoutError } from '@/lib/ai/errors';
