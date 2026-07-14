/**
 * Notification error hierarchy.
 */
export class NotificationError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'NotificationError';
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

export class NotificationNotFoundError extends NotificationError {
  constructor(id: string) {
    super('NOTIFICATION_NOT_FOUND', `Notification "${id}" not found.`, 404, { id });
    this.name = 'NotificationNotFoundError';
  }
}

export class NotificationForbiddenError extends NotificationError {
  constructor(message: string) {
    super('NOTIFICATION_FORBIDDEN', message, 403);
    this.name = 'NotificationForbiddenError';
  }
}

export class NotificationValidationError extends NotificationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'NotificationValidationError';
  }
}

export class PreferenceNotFoundError extends NotificationError {
  constructor(category: string) {
    super('PREFERENCE_NOT_FOUND', `No preference found for category "${category}".`, 404, { category });
    this.name = 'PreferenceNotFoundError';
  }
}
