/**
 * Billing validation — pure validators for all billing inputs.
 */
import type { Plan } from '@/lib/rbac';
import type { BillingProviderSlug, SubscriptionInterval, SubscriptionStatus } from '@/lib/billing/types';
import { BillingValidationError } from '@/lib/billing/errors';

const PLAN_SLUGS: Plan[] = ['starter', 'creator', 'agency'];
const INTERVALS: SubscriptionInterval[] = ['monthly', 'yearly'];
const STATUSES: SubscriptionStatus[] = ['trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused'];
const PROVIDERS: BillingProviderSlug[] = ['stripe', 'razorpay', 'none'];

export function validatePlanSlug(slug: unknown): Plan {
  if (typeof slug !== 'string' || !slug.trim()) {
    throw new BillingValidationError('Plan slug is required.');
  }
  const trimmed = slug.trim().toLowerCase() as Plan;
  if (!PLAN_SLUGS.includes(trimmed)) {
    throw new BillingValidationError(`Plan must be one of: ${PLAN_SLUGS.join(', ')}.`);
  }
  return trimmed;
}

export function validateInterval(interval: unknown): SubscriptionInterval {
  if (interval === undefined || interval === null) return 'monthly';
  if (typeof interval !== 'string') {
    throw new BillingValidationError('Interval must be a string.');
  }
  const trimmed = interval.trim().toLowerCase() as SubscriptionInterval;
  if (!INTERVALS.includes(trimmed)) {
    throw new BillingValidationError(`Interval must be one of: ${INTERVALS.join(', ')}.`);
  }
  return trimmed;
}

export function validateSubscriptionStatus(status: unknown): SubscriptionStatus {
  if (typeof status !== 'string') {
    throw new BillingValidationError('Subscription status is required.');
  }
  const trimmed = status.trim().toLowerCase() as SubscriptionStatus;
  if (!STATUSES.includes(trimmed)) {
    throw new BillingValidationError(`Status must be one of: ${STATUSES.join(', ')}.`);
  }
  return trimmed;
}

export function validateProvider(provider: unknown): BillingProviderSlug | undefined {
  if (provider === undefined || provider === null) return undefined;
  if (typeof provider !== 'string') {
    throw new BillingValidationError('Provider must be a string.');
  }
  const trimmed = provider.trim().toLowerCase() as BillingProviderSlug;
  if (!PROVIDERS.includes(trimmed)) {
    throw new BillingValidationError(`Provider must be one of: ${PROVIDERS.join(', ')}.`);
  }
  return trimmed;
}

export function validateUrl(url: unknown, fieldName: string): string | undefined {
  if (url === undefined || url === null) return undefined;
  if (typeof url !== 'string') {
    throw new BillingValidationError(`${fieldName} must be a string.`);
  }
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  // Must be a relative path or an https URL (Stripe/Razorpay require https)
  try {
    if (trimmed.startsWith('/')) return trimmed;
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      throw new BillingValidationError(`${fieldName} must be an https URL or a relative path.`);
    }
    return trimmed;
  } catch {
    throw new BillingValidationError(`${fieldName} is not a valid URL.`);
  }
}

export function validateWorkspaceId(id: unknown): string | undefined {
  if (id === undefined || id === null) return undefined;
  if (typeof id !== 'string' || !id.trim()) return undefined;
  return id.trim();
}

export function validateLimit(raw: unknown, def = 50, max = 200): number {
  if (raw === undefined || raw === null) return def;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(max, Math.floor(n));
}

export function validateOffset(raw: unknown): number {
  if (raw === undefined || raw === null) return 0;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function validateProrate(prorate: unknown): boolean {
  if (prorate === undefined || prorate === null) return true;
  if (typeof prorate !== 'boolean') {
    throw new BillingValidationError('prorate must be a boolean.');
  }
  return prorate;
}
