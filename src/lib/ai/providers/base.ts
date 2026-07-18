/**
 * Base AI provider — shared infrastructure for all provider implementations.
 *
 * Concrete providers extend this class and implement `generate()` (and
 * optionally `generateStream()`). The base class provides:
 *  - credential lookup from environment variables
 *  - timeout/abort handling
 *  - the model registry pattern (resolveModel)
 *  - shared helpers for building usage records
 */
import type {
  AIGenerateRequest,
  AIGenerateResponse,
  AICallOptions,
  AIProvider,
  AIProviderSlug,
  AIModelInfo,
  AIUsage,
  AIMessage,
} from '@/lib/ai/types';
import { AIServiceError, AIUnavailableError, AITimeoutError } from '@/lib/ai/errors';

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly slug: AIProviderSlug;
  abstract readonly name: string;

  /** Environment variable name holding the API key. */
  protected abstract readonly apiKeyEnvVar: string;

  /** Registered models for this provider (ordered by preference). */
  protected abstract readonly models: AIModelInfo[];

  /** Default model id used when none is specified. */
  protected abstract readonly defaultModelId: string;

  isAvailable(): boolean {
    return !!this.getApiKey();
  }

  protected getApiKey(): string | undefined {
    return process.env[this.apiKeyEnvVar];
  }

  getDefaultModel(): string {
    return this.defaultModelId;
  }

  getModels(): AIModelInfo[] {
    return [...this.models];
  }

  resolveModel(modelId?: string): AIModelInfo {
    if (!modelId || modelId === 'default') {
      return this.models.find((m) => m.id === this.defaultModelId) ?? this.models[0];
    }
    return (
      this.models.find((m) => m.id === modelId) ??
      this.models.find((m) => m.id === this.defaultModelId) ??
      this.models[0]
    );
  }

  abstract generate(req: AIGenerateRequest, opts: AICallOptions): Promise<AIGenerateResponse>;

  // ===== Shared helpers =====

  /**
   * Build the messages array, prepending an optional system prompt.
   * Providers that use a dedicated system field (e.g. Claude, Gemini)
   * override this to extract the system message.
   */
  protected buildMessages(req: AIGenerateRequest): AIMessage[] {
    const messages: AIMessage[] = [];
    if (req.system) {
      messages.push({ role: 'system', content: req.system });
    }
    // If the caller passed a system message in `messages`, keep it
    messages.push(...req.messages);
    return messages;
  }

  /**
   * Create an AbortController that fires after timeoutMs, chained to an
   * optional external signal. Returns the controller + a cleanup function.
   */
  protected createTimeout(timeoutMs: number, externalSignal?: AbortSignal): {
    signal: AbortSignal;
    cleanup: () => void;
  } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        const onAbort = () => controller.abort();
        externalSignal.addEventListener('abort', onAbort, { once: true });
        return {
          signal: controller.signal,
          cleanup: () => {
            clearTimeout(timer);
            externalSignal.removeEventListener('abort', onAbort);
          },
        };
      }
    }

    return {
      signal: controller.signal,
      cleanup: () => clearTimeout(timer),
    };
  }

  /**
   * Guard: ensure the provider is available before attempting a call.
   */
  protected requireAvailable(): void {
    if (!this.isAvailable()) {
      throw new AIUnavailableError(
        `${this.name} is not configured. Set the ${this.apiKeyEnvVar} environment variable.`,
        { provider: this.slug },
      );
    }
  }

  /**
   * Build a zero-usage record (for providers that don't report usage).
   */
  protected zeroUsage(): AIUsage {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }
}
