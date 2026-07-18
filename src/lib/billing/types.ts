/**
 * Billing shared types — used across the billing service layer, providers,
 * route handlers, and the tool engine quota integration.
 *
 * Re-exports Plan type from rbac to avoid duplication.
 */
import type { Plan } from '@/lib/rbac';

export type { Plan };

// ===== Provider types =====

export type BillingProviderSlug = 'stripe' | 'razorpay' | 'none';
export const ALL_BILLING_PROVIDERS: BillingProviderSlug[] = ['stripe', 'razorpay', 'none'];

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'paused';

export type SubscriptionInterval = 'monthly' | 'yearly';

export type BillingEventType =
  | 'subscription_created'
  | 'subscription_renewed'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_canceled'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'invoice_generated'
  | 'quota_reset'
  | 'usage_threshold_reached';

export const ALL_BILLING_EVENT_TYPES: BillingEventType[] = [
  'subscription_created',
  'subscription_renewed',
  'subscription_upgraded',
  'subscription_downgraded',
  'subscription_canceled',
  'payment_succeeded',
  'payment_failed',
  'invoice_generated',
  'quota_reset',
  'usage_threshold_reached',
];

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

// ===== DTOs (returned to API consumers) =====

export interface PlanDTO {
  id: string;
  slug: Plan;
  name: string;
  description: string | null;
  priceMonthly: number; // dollars (converted from cents)
  priceYearly: number;
  currency: string;
  maxGenerations: number;
  maxTools: number;
  maxStorage: number; // GB
  teamSeats: number;
  apiAccess: boolean;
  whiteLabel: boolean;
  features: Record<string, unknown> | null;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  razorpayPlanIdMonthly: string | null;
  razorpayPlanIdYearly: string | null;
}

export interface SubscriptionDTO {
  id: string;
  workspaceId: string;
  plan: PlanDTO;
  status: SubscriptionStatus;
  interval: SubscriptionInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialEnd: string | null;
  provider: BillingProviderSlug | null;
  providerSubscriptionId: string | null;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingStatusDTO {
  workspaceId: string;
  subscription: SubscriptionDTO | null;
  plan: PlanDTO | null;
  usage: {
    generationsUsed: number;
    generationsLimit: number;
    generationsRemaining: number;
    tokensUsed: number;
    costUsd: number;
    periodStart: string;
    periodEnd: string;
  };
  entitlements: PlanEntitlements;
  isTrialing: boolean;
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  daysUntilRenewal: number | null;
}

export interface PlanEntitlements {
  plan: Plan;
  maxGenerations: number;
  maxTools: number;
  maxStorage: number;
  teamSeats: number;
  apiAccess: boolean;
  whiteLabel: boolean;
  features: Record<string, unknown> | null;
}

export interface InvoiceDTO {
  id: string;
  workspaceId: string;
  invoiceNo: string | null;
  amount: number; // dollars
  currency: string;
  status: InvoiceStatus;
  description: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  provider: BillingProviderSlug | null;
  providerInvoiceId: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface BillingEventDTO {
  id: string;
  workspaceId: string;
  type: BillingEventType;
  provider: BillingProviderSlug | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
}

// ===== Checkout =====

export interface CheckoutRequest {
  planSlug: Plan;
  interval: SubscriptionInterval;
  provider?: BillingProviderSlug;
  successUrl?: string;
  cancelUrl?: string;
  workspaceId?: string; // optional: if not provided, use active workspace
}

export interface CheckoutSession {
  provider: BillingProviderSlug;
  sessionId: string;
  url: string;
  workspaceId: string;
  planSlug: Plan;
  interval: SubscriptionInterval;
  expiresAt: string | null;
}

// ===== Plan change =====

export interface PlanChangeRequest {
  targetPlanSlug: Plan;
  interval?: SubscriptionInterval;
  workspaceId?: string;
  prorate?: boolean; // default true
}

export interface PlanChangeResult {
  subscription: SubscriptionDTO;
  proratedCredit: number; // in dollars
  proratedCharge: number; // in dollars
  effectiveImmediately: boolean;
  message: string;
}

// ===== Webhook =====

export interface WebhookResult {
  received: boolean;
  eventId: string | null;
  eventType: BillingEventType | null;
  processed: boolean;
  duplicate: boolean;
  error?: string;
}

// ===== Usage =====

export interface UsageSummary {
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  planSlug: Plan | null;
  generationsUsed: number;
  generationsLimit: number;
  generationsRemaining: number;
  tokensUsed: number;
  costUsd: number;
  storageUsedMb: number;
  teamSeatsUsed: number;
  percentUsed: number;
}

// ===== Quota check (used by tool engine) =====

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  reason?: string;
  planSlug: Plan;
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
}
