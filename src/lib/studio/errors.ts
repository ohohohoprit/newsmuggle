/**
 * Studio error hierarchy — normalized errors for the studio service.
 *
 * Code → status mapping:
 *   - PROVIDER_NOT_FOUND        404
 *   - PROVIDER_NOT_CONFIGURED   503
 *   - PROVIDER_NOT_AVAILABLE    503
 *   - ACCOUNT_NOT_FOUND         404
 *   - ACCOUNT_ALREADY_CONNECTED 409
 *   - AUTH_ERROR                401
 *   - RATE_LIMIT                429
 *   - SYNC_IN_PROGRESS          409
 *   - SYNC_FAILED               502
 *   - OAUTH_STATE_INVALID       401
 *   - OAUTH_CALLBACK_FAILED     400
 *   - ENTITLEMENT_REQUIRED      403
 *   - VALIDATION_ERROR          400
 *   - STUDIO_FORBIDDEN          403
 */
export class StudioError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'StudioError';
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

export class ProviderNotFoundError extends StudioError {
  constructor(provider: string) {
    super('PROVIDER_NOT_FOUND', `Social provider "${provider}" not found.`, 404, { provider });
    this.name = 'ProviderNotFoundError';
  }
}

export class ProviderNotConfiguredError extends StudioError {
  constructor(provider: string) {
    super(
      'PROVIDER_NOT_CONFIGURED',
      `Social provider "${provider}" is not configured. Set the required OAuth environment variables.`,
      503,
      { provider },
    );
    this.name = 'ProviderNotConfiguredError';
  }
}

export class ProviderNotAvailableError extends StudioError {
  constructor(provider: string) {
    super(
      'PROVIDER_NOT_AVAILABLE',
      `Social provider "${provider}" is not yet available. It will be supported in a future release.`,
      503,
      { provider },
    );
    this.name = 'ProviderNotAvailableError';
  }
}

export class AccountNotFoundError extends StudioError {
  constructor(provider: string, workspaceId?: string) {
    super(
      'ACCOUNT_NOT_FOUND',
      workspaceId
        ? `No connected ${provider} account found in this workspace.`
        : `No connected ${provider} account found.`,
      404,
      { provider, workspaceId },
    );
    this.name = 'AccountNotFoundError';
  }
}

export class AccountAlreadyConnectedError extends StudioError {
  constructor(provider: string, providerAccountId: string) {
    super(
      'ACCOUNT_ALREADY_CONNECTED',
      `This ${provider} account (${providerAccountId}) is already connected to this workspace.`,
      409,
      { provider, providerAccountId },
    );
    this.name = 'AccountAlreadyConnectedError';
  }
}

export class StudioAuthError extends StudioError {
  constructor(provider: string, message: string) {
    super('AUTH_ERROR', `[${provider}] ${message}`, 401, { provider });
    this.name = 'StudioAuthError';
  }
}

export class StudioRateLimitError extends StudioError {
  constructor(provider: string, message: string) {
    super('RATE_LIMIT', `[${provider}] ${message}`, 429, { provider });
    this.name = 'StudioRateLimitError';
  }
}

export class SyncInProgressError extends StudioError {
  constructor(provider: string) {
    super('SYNC_IN_PROGRESS', `A sync is already in progress for ${provider}. Please wait for it to complete.`, 409, { provider });
    this.name = 'SyncInProgressError';
  }
}

export class SyncFailedError extends StudioError {
  constructor(provider: string, message: string) {
    super('SYNC_FAILED', `[${provider}] ${message}`, 502, { provider });
    this.name = 'SyncFailedError';
  }
}

export class OAuthStateInvalidError extends StudioError {
  constructor(message = 'OAuth state mismatch. Please retry the connection.') {
    super('OAUTH_STATE_INVALID', message, 401);
    this.name = 'OAuthStateInvalidError';
  }
}

export class OAuthCallbackFailedError extends StudioError {
  constructor(provider: string, message: string) {
    super('OAUTH_CALLBACK_FAILED', `[${provider}] ${message}`, 400, { provider });
    this.name = 'OAuthCallbackFailedError';
  }
}

export class EntitlementRequiredError extends StudioError {
  constructor(feature: string, currentPlan: string, requiredPlan: string) {
    super(
      'ENTITLEMENT_REQUIRED',
      `The "${feature}" feature requires the ${requiredPlan} plan or higher. Your current plan: ${currentPlan}.`,
      403,
      { feature, currentPlan, requiredPlan },
    );
    this.name = 'EntitlementRequiredError';
  }
}

export class StudioValidationError extends StudioError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'StudioValidationError';
  }
}

export class StudioForbiddenError extends StudioError {
  constructor(message: string) {
    super('STUDIO_FORBIDDEN', message, 403);
    this.name = 'StudioForbiddenError';
  }
}
