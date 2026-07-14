/**
 * Security error hierarchy.
 */
export class SecurityError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      status: this.status,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export class RateLimitExceededError extends SecurityError {
  constructor(retryAfterMs: number, limit: number, scope: string) {
    super(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests. Please slow down and try again later.',
      429,
      { retryAfterMs, limit, scope },
    );
    this.name = 'RateLimitExceededError';
  }
}

export class BlockedRequestError extends SecurityError {
  constructor(blockedUntil: Date, reason: string) {
    super(
      'BLOCKED_REQUEST',
      `Request blocked due to suspicious activity. Blocked until ${blockedUntil.toISOString()}. Reason: ${reason}`,
      403,
      { blockedUntil: blockedUntil.toISOString(), reason },
    );
    this.name = 'BlockedRequestError';
  }
}

export class SecurityValidationError extends SecurityError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'SecurityValidationError';
  }
}

export class SecurityForbiddenError extends SecurityError {
  constructor(message: string) {
    super('SECURITY_FORBIDDEN', message, 403);
    this.name = 'SecurityForbiddenError';
  }
}
