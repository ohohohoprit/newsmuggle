/**
 * File error hierarchy.
 */
export class FileError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'FileError';
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

export class FileNotFoundError extends FileError {
  constructor(id: string) {
    super('FILE_NOT_FOUND', `File "${id}" not found.`, 404, { id });
    this.name = 'FileNotFoundError';
  }
}

export class FileAccessDeniedError extends FileError {
  constructor(fileId: string, userId: string) {
    super('FILE_ACCESS_DENIED', 'You do not have access to this file.', 403, { fileId, userId });
    this.name = 'FileAccessDeniedError';
  }
}

export class FileValidationError extends FileError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'FileValidationError';
  }
}

export class StorageError extends FileError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('STORAGE_ERROR', message, 500, details);
    this.name = 'StorageError';
  }
}

export class StorageNotConfiguredError extends FileError {
  constructor(provider: string) {
    super('STORAGE_NOT_CONFIGURED', `Storage provider "${provider}" is not configured. Set the required environment variables.`, 503, { provider });
    this.name = 'StorageNotConfiguredError';
  }
}

export class SignedUrlExpiredError extends FileError {
  constructor() {
    super('SIGNED_URL_EXPIRED', 'This download link has expired.', 410);
    this.name = 'SignedUrlExpiredError';
  }
}

export class SignedUrlRevokedError extends FileError {
  constructor() {
    super('SIGNED_URL_REVOKED', 'This download link has been revoked.', 403);
    this.name = 'SignedUrlRevokedError';
  }
}

export class DownloadLimitExceededError extends FileError {
  constructor(limit: number) {
    super('DOWNLOAD_LIMIT_EXCEEDED', `This link has reached its download limit of ${limit}.`, 403, { limit });
    this.name = 'DownloadLimitExceededError';
  }
}

export class EntitlementRequiredError extends FileError {
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
