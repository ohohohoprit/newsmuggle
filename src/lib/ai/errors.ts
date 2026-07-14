/**
 * Normalized AI error hierarchy.
 *
 * Every provider implementation MUST translate its native errors into
 * one of these classes. The AI service and the tool engine only ever
 * catch AIServiceError — never provider-specific error types.
 *
 * Error codes:
 *   - AUTH_ERROR          Invalid or missing API key / credentials
 *   - RATE_LIMIT          Provider returned a rate-limit response (429)
 *   - TIMEOUT             Request exceeded the timeout
 *   - NETWORK_ERROR       Fetch/network failure (DNS, connection refused, etc.)
 *   - SAFETY_BLOCK        Provider blocked the content for safety reasons
 *   - CONTEXT_LENGTH      Request exceeded the model's context window
 *   - INVALID_REQUEST     Provider rejected the request (400-class)
 *   - PROVIDER_ERROR      Provider returned a 5xx or unexpected error
 *   - INTERNAL_ERROR      Bug in our code (serialization, parsing, etc.)
 *   - UNAVAILABLE         Provider not configured or disabled
 */
import type { AIProviderSlug } from '@/lib/ai/types';

export type AIErrorCode =
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'SAFETY_BLOCK'
  | 'CONTEXT_LENGTH'
  | 'INVALID_REQUEST'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR'
  | 'UNAVAILABLE';

export interface AIErrorMeta {
  provider?: AIProviderSlug;
  model?: string;
  status?: number;
  retryAfterMs?: number;
  /** The provider's raw error payload for debugging. */
  raw?: unknown;
}

/**
 * Base class for all AI errors. Every error carries:
 *  - code: stable machine-readable identifier
 *  - message: human-readable description
 *  - retryable: whether the AI service should retry this error
 *  - meta: provider/status/raw payload for debugging
 */
export class AIServiceError extends Error {
  readonly code: AIErrorCode;
  readonly retryable: boolean;
  readonly meta: AIErrorMeta;

  constructor(
    code: AIErrorCode,
    message: string,
    opts: { retryable?: boolean; meta?: AIErrorMeta } = {},
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.retryable = opts.retryable ?? false;
    this.meta = opts.meta ?? {};
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** True if this error should be retried per its code. */
  shouldRetry(): boolean {
    return this.retryable;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      provider: this.meta.provider,
      model: this.meta.model,
      status: this.meta.status,
    };
  }
}

/** Invalid or missing API key / credentials. Never retryable. */
export class AIAuthError extends AIServiceError {
  constructor(message: string, meta: AIErrorMeta = {}) {
    super('AUTH_ERROR', message, { retryable: false, meta });
    this.name = 'AIAuthError';
  }
}

/** Provider returned a rate-limit response (429). Retryable with backoff. */
export class AIRateLimitError extends AIServiceError {
  constructor(message: string, meta: AIErrorMeta = {}) {
    super('RATE_LIMIT', message, { retryable: true, meta });
    this.name = 'AIRateLimitError';
  }
}

/** Request exceeded the timeout. Retryable. */
export class AITimeoutError extends AIServiceError {
  constructor(message: string, meta: AIErrorMeta = {}) {
    super('TIMEOUT', message, { retryable: true, meta });
    this.name = 'AITimeoutError';
  }
}

/** Network failure (DNS, connection refused, etc.). Retryable. */
export class AINetworkError extends AIServiceError {
  constructor(message: string, meta: AIErrorMeta = {}) {
    super('NETWORK_ERROR', message, { retryable: true, meta });
    this.name = 'AINetworkError';
  }
}

/** Provider blocked the content for safety reasons. Never retryable. */
export class AISafetyBlockError extends AIServiceError {
  constructor(message: string, meta: AIErrorMeta = {}) {
    super('SAFETY_BLOCK', message, { retryable: false, meta });
    this.name = 'AISafetyBlockError';
  }
}

/** Request exceeded the model's context window. Never retryable. */
export class AIContextLengthError extends AIServiceError {
  constructor(message: string, meta: AIErrorMeta = {}) {
    super('CONTEXT_LENGTH', message, { retryable: false, meta });
    this.name = 'AIContextLengthError';
  }
}

/** Provider rejected the request (400-class). Never retryable. */
export class AIInvalidRequestError extends AIServiceError {
  constructor(message: string, meta: AIErrorMeta = {}) {
    super('INVALID_REQUEST', message, { retryable: false, meta });
    this.name = 'AIInvalidRequestError';
  }
}

/** Provider returned a 5xx or unexpected error. Retryable. */
export class AIProviderError extends AIServiceError {
  constructor(message: string, meta: AIErrorMeta = {}) {
    super('PROVIDER_ERROR', message, { retryable: true, meta });
    this.name = 'AIProviderError';
  }
}

/** Bug in our code (serialization, parsing, etc.). Never retryable. */
export class AIInternalError extends AIServiceError {
  constructor(message: string, meta: AIErrorMeta = {}) {
    super('INTERNAL_ERROR', message, { retryable: false, meta });
    this.name = 'AIInternalError';
  }
}

/** Provider not configured or disabled. Never retryable. */
export class AIUnavailableError extends AIServiceError {
  constructor(message: string, meta: AIErrorMeta = {}) {
    super('UNAVAILABLE', message, { retryable: false, meta });
    this.name = 'AIUnavailableError';
  }
}

// ===== Factory: normalize an unknown error into an AIServiceError =====

/**
 * Translate an arbitrary thrown value into an AIServiceError.
 * Used by provider implementations to wrap native SDK errors.
 */
export function normalizeError(
  err: unknown,
  provider: AIProviderSlug,
  model?: string,
): AIServiceError {
  // Already normalized
  if (err instanceof AIServiceError) {
    // Ensure meta.provider is set
    if (!err.meta.provider) {
      err.meta.provider = provider;
    }
    if (!err.meta.model && model) {
      err.meta.model = model;
    }
    return err;
  }

  // AbortError (timeout/cancellation)
  if (err instanceof Error && err.name === 'AbortError') {
    return new AITimeoutError('Request timed out or was cancelled.', { provider, model });
  }

  // Network/fetch errors
  if (err instanceof TypeError && /fetch|network|failed to fetch/i.test(err.message)) {
    return new AINetworkError(err.message, { provider, model });
  }

  // Object with status code (typical of SDK errors)
  if (err && typeof err === 'object' && 'status' in err) {
    const errObj = err as Record<string, unknown>;
    const status = Number(errObj.status);
    const message =
      typeof errObj.message === 'string'
        ? errObj.message
        : `Provider returned status ${status}`;
    return classifyHttpError(status, message, provider, model, err);
  }

  // Object with statusCode (some SDKs use this)
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const errObj = err as Record<string, unknown>;
    const status = Number(errObj.statusCode);
    const message =
      typeof errObj.message === 'string'
        ? errObj.message
        : `Provider returned status ${status}`;
    return classifyHttpError(status, message, provider, model, err);
  }

  // Plain Error
  if (err instanceof Error) {
    return new AIInternalError(err.message, { provider, model, raw: err });
  }

  // Unknown
  return new AIInternalError('Unknown error during AI generation.', { provider, model, raw: err });
}

function classifyHttpError(
  status: number,
  message: string,
  provider: AIProviderSlug,
  model?: string,
  raw?: unknown,
): AIServiceError {
  const meta: AIErrorMeta = { provider, model, status, raw };

  if (status === 401 || status === 403) {
    return new AIAuthError(message || 'Invalid API key or credentials.', meta);
  }
  if (status === 429) {
    return new AIRateLimitError(message || 'Rate limit exceeded.', meta);
  }
  if (status === 408) {
    return new AITimeoutError(message || 'Request timed out.', meta);
  }
  if (status >= 400 && status < 500) {
    // Check for safety block keywords
    if (/safety|content.?policy|filtered|blocked/i.test(message)) {
      return new AISafetyBlockError(message, meta);
    }
    if (/context.?length|too.?long|token.?limit/i.test(message)) {
      return new AIContextLengthError(message, meta);
    }
    return new AIInvalidRequestError(message, meta);
  }
  if (status >= 500) {
    return new AIProviderError(message || `Provider returned status ${status}.`, meta);
  }
  return new AIProviderError(message || `Unexpected status ${status}.`, meta);
}
