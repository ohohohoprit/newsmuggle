/**
 * Unified AI types — shared across all providers, the router, and the service.
 *
 * Every provider implementation translates between its native SDK types
 * and these unified types. The AI service and the tool engine only ever
 * touch these types — never provider-specific SDK types.
 */
import type { AIProviderSlug } from '@/lib/tools/types';

// Re-export for convenience so callers can import everything from '@/lib/ai/types'
export type { AIProviderSlug };

// ===== Messages =====

export type AIRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIRole;
  content: string;
}

// ===== Generation request =====

export interface AIGenerateRequest {
  /** Messages to send. Must include at least one user message. */
  messages: AIMessage[];
  /** Optional explicit system prompt (prepended to messages if provided). */
  system?: string;
  /** Sampling temperature (0-2). Defaults to 0.8. */
  temperature?: number;
  /** Max tokens to generate. Provider default if omitted. */
  maxTokens?: number;
  /** Enable extended thinking (provider-specific; no-op if unsupported). */
  thinkingEnabled?: boolean;
  /** Stop sequences. */
  stop?: string[];
  /**
   * Request-scoped provider override. If omitted, the router selects
   * based on tool default -> environment default.
   */
  provider?: AIProviderSlug;
  /** Request-scoped model override within the selected provider. */
  model?: string;
  /**
   * Caller hint for routing/usage attribution. The service does not
   * persist this directly; it uses it to populate the ToolExecution row.
   */
  metadata?: {
    toolId?: string;
    toolSlug?: string;
    userId?: string;
    workspaceId?: string;
    executionId?: string;
  };
}

// ===== Usage tracking =====

export interface AIUsage {
  /** Tokens in the prompt (input). */
  promptTokens: number;
  /** Tokens in the completion (output). */
  completionTokens: number;
  /** promptTokens + completionTokens. */
  totalTokens: number;
}

// ===== Cost =====

export interface AICost {
  /** Estimated cost in USD. */
  usd: number;
  /** Pricing basis used (per 1K tokens). */
  promptPer1k: number;
  completionPer1k: number;
}

// ===== Generation response =====

export interface AIGenerateResponse {
  /** The generated text content. */
  content: string;
  /** The provider that handled the request. */
  provider: AIProviderSlug;
  /** The model that was actually used (resolved name). */
  model: string;
  /** Wall-clock latency in milliseconds. */
  latencyMs: number;
  /** Token usage (best-effort; some providers omit fields). */
  usage: AIUsage;
  /** Estimated cost in USD. */
  cost: AICost;
  /** Provider-reported finish reason (stop|length|safety|...). */
  finishReason?: string;
  /** Number of retries that occurred. */
  retries: number;
  /** Provider-specific raw response flags (e.g. safety ratings). */
  flags?: Record<string, unknown>;
}

// ===== Provider capability descriptor =====

export interface AIProviderInfo {
  slug: AIProviderSlug;
  name: string;
  /** Whether the provider is available (has API key configured). */
  available: boolean;
  /** Default model used when none is specified. */
  defaultModel: string;
  /** Supported models (for admin UI). */
  models: AIModelInfo[];
  /** Whether streaming is supported. */
  supportsStreaming: boolean;
  /** Whether extended thinking is supported. */
  supportsThinking: boolean;
}

export interface AIModelInfo {
  /** Model identifier as expected by the provider. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Cost per 1K prompt tokens in USD. */
  promptCostPer1k: number;
  /** Cost per 1K completion tokens in USD. */
  completionCostPer1k: number;
  /** Max context window in tokens. */
  contextWindow: number;
  /** Whether the model supports streaming. */
  supportsStreaming: boolean;
}

// ===== Provider interface =====

export interface AIProvider {
  readonly slug: AIProviderSlug;
  readonly name: string;
  /** Whether the provider is configured (has credentials). */
  isAvailable(): boolean;
  /** Get the default model for this provider. */
  getDefaultModel(): string;
  /** Get all supported models. */
  getModels(): AIModelInfo[];
  /** Find a model by id (returns the model info or the default). */
  resolveModel(modelId?: string): AIModelInfo;
  /**
   * Generate a completion. Implementations MUST:
   *  - throw normalized AIServiceError subclasses on failure
   *  - return a populated AIUsage (best-effort estimate if provider omits)
   *  - respect the timeout signal
   */
  generate(req: AIGenerateRequest, opts: AICallOptions): Promise<AIGenerateResponse>;
  /**
   * Stream a completion. Designed now so streaming can be wired later
   * without changing the tool engine. Yields incremental text chunks.
   */
  generateStream?(req: AIGenerateRequest, opts: AICallOptions): AsyncGenerator<AIStreamChunk, AIGenerateResponse, unknown>;
}

export interface AICallOptions {
  /** Abort signal for timeout/cancellation. */
  signal?: AbortSignal;
  /** Hard timeout in milliseconds. */
  timeoutMs?: number;
  /** Maximum retries for transient failures. */
  maxRetries?: number;
}

export interface AIStreamChunk {
  /** Incremental text delta. */
  delta: string;
  /** True when this is the final chunk. */
  done: boolean;
}

// ===== Retry policy =====

export interface AIRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  /** HTTP status codes that should trigger a retry. */
  retryableStatuses: number[];
  /** Error codes (from AIServiceError.code) that should trigger a retry. */
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: AIRetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 8000,
  backoffFactor: 2,
  retryableStatuses: [408, 425, 429, 500, 502, 503, 504],
  retryableErrors: [
    'RATE_LIMIT',
    'TIMEOUT',
    'NETWORK_ERROR',
    'PROVIDER_ERROR',
    'INTERNAL_ERROR',
  ],
};

// ===== Streaming result (for future use) =====

export interface AIStreamResult {
  chunks: AsyncGenerator<AIStreamChunk, AIGenerateResponse, unknown>;
  /** Cancel the stream. */
  cancel(): void;
}
