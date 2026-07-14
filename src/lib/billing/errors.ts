/**
 * Billing error hierarchy — normalized errors for the billing service.
 *
 * Code → status mapping:
 *   - PLAN_NOT_FOUND         404
 *   - PLAN_INACTIVE          403
 *   - SUBSCRIPTION_NOT_FOUND 404
 *   - SUBSCRIPTION_INACTIVE  403
 *   - WORKSPACE_NOT_BILLABLE 400
 *   - QUOTA_EXCEEDED         429
 *   - PLAN_DOWNGRADE_BLOCKED 400
 *   - PROVIDER_NOT_CONFIGURED 503
 *   - PROVIDER_ERROR         502
 *   - WEBHOOK_SIGNATURE_INVALID 401
 *   - WEBHOOK_EVENT_REPLAY   200 (not an error, just a signal)
 *   - VALIDATION_ERROR       400
 *   - BILLING_FORBIDDEN      403
 */
export class BillingError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'BillingError';
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

export class PlanNotFoundError extends BillingError {
  constructor(slug: string) {
    super('PLAN_NOT_FOUND', `Plan "${slug}" not found.`, 404, { slug });
    this.name = 'PlanNotFoundError';
  }
}

export class PlanInactiveError extends BillingError {
  constructor(slug: string) {
    super('PLAN_INACTIVE', `Plan "${slug}" is not available.`, 403, { slug });
    this.name = 'PlanInactiveError';
  }
}

export class SubscriptionNotFoundError extends BillingError {
  constructor(workspaceId: string) {
    super('SUBSCRIPTION_NOT_FOUND', 'No subscription found for this workspace.', 404, { workspaceId });
    this.name = 'SubscriptionNotFoundError';
  }
}

export class SubscriptionInactiveError extends BillingError {
  constructor(status: string) {
    super('SUBSCRIPTION_INACTIVE', `Subscription is not active (status: ${status}).`, 403, { status });
    this.name = 'SubscriptionInactiveError';
  }
}

export class WorkspaceNotBillableError extends BillingError {
  constructor(workspaceId: string) {
    super('WORKSPACE_NOT_BILLABLE', 'This workspace is not billable. You must be an owner or admin.', 400, { workspaceId });
    this.name = 'WorkspaceNotBillableError';
  }
}

export class QuotaExceededError extends BillingError {
  constructor(used: number, limit: number, planSlug: string) {
    super(
      'QUOTA_EXCEEDED',
      `You have reached your monthly generation limit (${limit}). Upgrade your plan to continue.`,
      429,
      { used, limit, planSlug },
    );
    this.name = 'QuotaExceededError';
  }
}

export class PlanDowngradeBlockedError extends BillingError {
  constructor(currentPlan: string, targetPlan: string, reason: string) {
    super(
      'PLAN_DOWNGRADE_BLOCKED',
      `Cannot downgrade from ${currentPlan} to ${targetPlan}: ${reason}`,
      400,
      { currentPlan, targetPlan, reason },
    );
    this.name = 'PlanDowngradeBlockedError';
  }
}

export class ProviderNotConfiguredError extends BillingError {
  constructor(provider: string) {
    super(
      'PROVIDER_NOT_CONFIGURED',
      `Billing provider "${provider}" is not configured. Set the required environment variables.`,
      503,
      { provider },
    );
    this.name = 'ProviderNotConfiguredError';
  }
}

export class ProviderError extends BillingError {
  constructor(provider: string, message: string, details?: Record<string, unknown>) {
    super('PROVIDER_ERROR', `[${provider}] ${message}`, 502, { provider, ...details });
    this.name = 'ProviderError';
  }
}

export class WebhookSignatureInvalidError extends BillingError {
  constructor(provider: string) {
    super('WEBHOOK_SIGNATURE_INVALID', `Webhook signature verification failed for ${provider}.`, 401, { provider });
    this.name = 'WebhookSignatureInvalidError';
  }
}

export class BillingValidationError extends BillingError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'BillingValidationError';
  }
}

export class BillingForbiddenError extends BillingError {
  constructor(message: string) {
    super('BILLING_FORBIDDEN', message, 403);
    this.name = 'BillingForbiddenError';
  }
}
