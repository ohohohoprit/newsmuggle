/**
 * Base billing provider — defines the interface that all payment
 * providers (Stripe, Razorpay) must implement.
 *
 * Concrete providers extend this class and implement the methods. The
 * billing service selects the active provider via the `BILLING_PROVIDER`
 * environment variable.
 *
 * If no provider is configured (or the env vars are missing), the system
 * falls back to a "manual" mode where subscriptions can be created/
 * upgraded directly via the API without going through a payment provider.
 * This is useful for development, manual billing, or self-hosted deployments.
 */
import type {
  BillingProviderSlug,
  CheckoutSession,
  SubscriptionStatus,
  SubscriptionInterval,
} from '@/lib/billing/types';
import type { Plan } from '@/lib/rbac';

export interface CreateCheckoutInput {
  workspaceId: string;
  workspaceName: string;
  customerEmail: string | null;
  planSlug: Plan;
  interval: SubscriptionInterval;
  successUrl: string;
  cancelUrl: string;
  /** The provider-specific price ID (resolved by the billing service). */
  priceId: string | null;
  /** Metadata to attach to the checkout session. */
  metadata: Record<string, string>;
}

export interface ProviderSubscriptionSync {
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  providerCustomerId?: string;
  providerStatus?: string;
  providerMetadata?: Record<string, unknown>;
}

export interface CancelSubscriptionInput {
  providerSubscriptionId: string;
  immediately?: boolean;
}

export interface ChangePlanInput {
  providerSubscriptionId: string;
  newPriceId: string | null;
  prorate?: boolean;
}

export abstract class BillingProvider {
  abstract readonly slug: BillingProviderSlug;
  abstract readonly name: string;

  /** Whether the provider is configured (has API keys set). */
  abstract isConfigured(): boolean;

  /**
   * Create a checkout session for a new subscription.
   * Returns the session ID + URL the frontend should redirect to.
   */
  abstract createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;

  /**
   * Cancel a subscription at the provider.
   */
  abstract cancelSubscription(input: CancelSubscriptionInput): Promise<ProviderSubscriptionSync>;

  /**
   * Change the plan of an existing subscription at the provider.
   */
  abstract changePlan(input: ChangePlanInput): Promise<ProviderSubscriptionSync>;

  /**
   * Fetch the current state of a subscription from the provider.
   */
  abstract getSubscription?(providerSubscriptionId: string): Promise<ProviderSubscriptionSync>;

  /**
   * Verify a webhook signature and return the raw event payload.
   * Throws WebhookSignatureInvalidError if verification fails.
   */
  abstract verifyWebhook(payload: string | Buffer, signature: string, signatureHeader?: string): Promise<unknown>;

  /**
   * Parse a verified webhook payload into a normalized event shape.
   */
  abstract parseWebhookEvent(rawEvent: unknown): {
    eventId: string;
    eventType: string;
    workspaceId: string | null;
    subscriptionId: string | null;
    customerId: string | null;
    planSlug: Plan | null;
    interval: SubscriptionInterval | null;
    status: SubscriptionStatus | null;
    amount: number | null; // cents
    currency: string | null;
    invoiceId: string | null;
    paymentId: string | null;
    hostedInvoiceUrl: string | null;
    invoicePdfUrl: string | null;
    periodStart: Date | null;
    periodEnd: Date | null;
    raw: unknown;
  };
}
