/**
 * Manual billing provider — used when no external provider is configured.
 *
 * This is the default fallback. It allows subscriptions to be created/
 * upgraded directly via the API without going through Stripe or Razorpay.
 * Useful for:
 *   - Development and testing
 *   - Self-hosted deployments with manual billing
 *   - Free plans that don't require payment
 */
import type {
  BillingProviderSlug,
  CheckoutSession,
  SubscriptionStatus,
  SubscriptionInterval,
} from '@/lib/billing/types';
import type { Plan } from '@/lib/rbac';
import { BillingProvider, type CreateCheckoutInput, type ProviderSubscriptionSync, type CancelSubscriptionInput, type ChangePlanInput } from '@/lib/billing/providers/base';
import { ProviderError } from '@/lib/billing/errors';

export class ManualBillingProvider extends BillingProvider {
  readonly slug: BillingProviderSlug = 'none';
  readonly name = 'Manual (no external provider)';

  isConfigured(): boolean {
    return true; // always available
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    // For the manual provider, "checkout" just means the subscription will
    // be created directly. We return a fake session with a redirect URL
    // that the frontend can use to confirm.
    const sessionId = `manual_${input.workspaceId}_${Date.now()}`;
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000';
    return {
      provider: 'none',
      sessionId,
      url: `${baseUrl}/api/billing/checkout/confirm?session_id=${sessionId}&workspace=${input.workspaceId}&plan=${input.planSlug}&interval=${input.interval}`,
      workspaceId: input.workspaceId,
      planSlug: input.planSlug,
      interval: input.interval,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    };
  }

  async cancelSubscription(input: CancelSubscriptionInput): Promise<ProviderSubscriptionSync> {
    // For manual provider, we don't actually call an external API.
    // The subscription service handles the DB update.
    return {
      providerSubscriptionId: input.providerSubscriptionId,
      status: input.immediately ? 'canceled' : 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      cancelAtPeriodEnd: !input.immediately,
      providerStatus: input.immediately ? 'cancelled' : 'active',
    };
  }

  async changePlan(input: ChangePlanInput): Promise<ProviderSubscriptionSync> {
    return {
      providerSubscriptionId: input.providerSubscriptionId,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      providerStatus: 'active',
    };
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionSync> {
    return {
      providerSubscriptionId,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      providerStatus: 'active',
    };
  }

  async verifyWebhook(_payload: string | Buffer, _signature: string, _signatureHeader?: string): Promise<unknown> {
    // Manual provider doesn't receive webhooks
    throw new ProviderError('manual', 'Manual provider does not support webhooks.');
  }

  parseWebhookEvent(_rawEvent: unknown): {
    eventId: string;
    eventType: string;
    workspaceId: string | null;
    subscriptionId: string | null;
    customerId: string | null;
    planSlug: Plan | null;
    interval: SubscriptionInterval | null;
    status: SubscriptionStatus | null;
    amount: number | null;
    currency: string | null;
    invoiceId: string | null;
    paymentId: string | null;
    hostedInvoiceUrl: string | null;
    invoicePdfUrl: string | null;
    periodStart: Date | null;
    periodEnd: Date | null;
    raw: unknown;
  } {
    throw new ProviderError('manual', 'Manual provider does not support webhooks.');
  }
}
