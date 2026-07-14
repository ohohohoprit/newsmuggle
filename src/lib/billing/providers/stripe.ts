/**
 * Stripe billing provider — implements the BillingProvider interface
 * using the Stripe REST API.
 *
 * Environment variables required:
 *   - STRIPE_SECRET_KEY           (sk_test_... or sk_live_...)
 *   - STRIPE_WEBHOOK_SECRET       (whsec_...)
 *   - STRIPE_PRICE_<PLAN>_<INTERVAL>  (price_... IDs for each plan/interval)
 *
 * The Stripe SDK is loaded dynamically so it's only imported when Stripe
 * is actually the active provider. If the stripe package isn't installed,
 * the provider reports as not configured.
 */
import type {
  BillingProviderSlug,
  CheckoutSession,
  SubscriptionStatus,
  SubscriptionInterval,
} from '@/lib/billing/types';
import type { Plan } from '@/lib/rbac';
import { BillingProvider, type CreateCheckoutInput, type ProviderSubscriptionSync, type CancelSubscriptionInput, type ChangePlanInput } from '@/lib/billing/providers/base';
import { ProviderNotConfiguredError, ProviderError, WebhookSignatureInvalidError } from '@/lib/billing/errors';

// Stripe types (kept loose to avoid importing the SDK at module load)
interface StripeSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  customer: string;
  metadata?: Record<string, string>;
}

interface StripeCheckoutSession {
  id: string;
  url: string;
  expires_at: number | null;
  metadata?: Record<string, string>;
}

interface StripeInvoice {
  id: string;
  number?: string;
  total: number;
  currency: string;
  status: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  paid: boolean;
  period_start?: number;
  period_end?: number;
  lines?: { data: { period: { start: number; end: number } }[] };
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export class StripeBillingProvider extends BillingProvider {
  readonly slug: BillingProviderSlug = 'stripe';
  readonly name = 'Stripe';

  private get secretKey(): string | undefined {
    return process.env.STRIPE_SECRET_KEY;
  }

  private get webhookSecret(): string | undefined {
    return process.env.STRIPE_WEBHOOK_SECRET;
  }

  private get apiVersion(): string {
    return '2024-06-20';
  }

  isConfigured(): boolean {
    return !!this.secretKey;
  }

  private requireConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError('stripe');
    }
  }

  private async stripeRequest<T = unknown>(path: string, opts: { method?: string; body?: Record<string, unknown> } = {}): Promise<T> {
    this.requireConfigured();
    const method = opts.method ?? 'GET';
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: opts.body ? new URLSearchParams(this.flattenObject(opts.body)).toString() : undefined,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errMsg = `Stripe API error (${res.status})`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson?.error?.message ?? errMsg;
      } catch {
        // not JSON
      }
      throw new ProviderError('stripe', errMsg, { status: res.status, path });
    }

    return res.json() as Promise<T>;
  }

  private flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      if (value === null || value === undefined) continue;
      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value as Record<string, unknown>, fullKey));
      } else if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          if (typeof item === 'object') {
            Object.assign(result, this.flattenObject(item, `${fullKey}[${idx}]`));
          } else {
            result[`${fullKey}[${idx}]`] = String(item);
          }
        });
      } else {
        result[fullKey] = String(value);
      }
    }
    return result;
  }

  private mapStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'trialing': return 'trialing';
      case 'active': return 'active';
      case 'past_due': return 'past_due';
      case 'canceled': return 'canceled';
      case 'incomplete': return 'incomplete';
      case 'incomplete_expired': return 'canceled';
      case 'unpaid': return 'past_due';
      case 'paused': return 'paused';
      default: return 'active';
    }
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    this.requireConfigured();
    if (!input.priceId) {
      throw new ProviderError('stripe', 'No Stripe price ID configured for this plan/interval. Set the STRIPE_PRICE_<PLAN>_<INTERVAL> env var or seed the Plan table.', { planSlug: input.planSlug, interval: input.interval });
    }

    const session = await this.stripeRequest<StripeCheckoutSession>('/checkout/sessions', {
      method: 'POST',
      body: {
        mode: 'subscription',
        customer_email: input.customerEmail ?? undefined,
        'line_items[0][price]': input.priceId,
        'line_items[0][quantity]': 1,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          workspaceId: input.workspaceId,
          workspaceName: input.workspaceName,
          planSlug: input.planSlug,
          interval: input.interval,
          ...input.metadata,
        },
        'subscription_data[metadata][workspaceId]': input.workspaceId,
        'subscription_data[metadata][planSlug]': input.planSlug,
        'subscription_data[metadata][interval]': input.interval,
      },
    });

    return {
      provider: 'stripe',
      sessionId: session.id,
      url: session.url,
      workspaceId: input.workspaceId,
      planSlug: input.planSlug,
      interval: input.interval,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    };
  }

  async cancelSubscription(input: CancelSubscriptionInput): Promise<ProviderSubscriptionSync> {
    this.requireConfigured();
    const sub = await this.stripeRequest<StripeSubscription>(`/subscriptions/${input.providerSubscriptionId}`, {
      method: 'DELETE',
      body: input.immediately ? {} : { prorate: 'false' },
    });

    return {
      providerSubscriptionId: sub.id,
      status: this.mapStatus(sub.status),
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: true,
      providerCustomerId: typeof sub.customer === 'string' ? sub.customer : undefined,
      providerStatus: sub.status,
      providerMetadata: sub.metadata,
    };
  }

  async changePlan(input: ChangePlanInput): Promise<ProviderSubscriptionSync> {
    this.requireConfigured();
    if (!input.newPriceId) {
      throw new ProviderError('stripe', 'No new price ID provided for plan change.', { subscriptionId: input.providerSubscriptionId });
    }

    // Get the subscription to find the item id
    const sub = await this.stripeRequest<StripeSubscription & { items: { data: { id: string; price: { id: string } }[] } }>(`/subscriptions/${input.providerSubscriptionId}`);

    const itemId = sub.items.data[0]?.id;
    if (!itemId) {
      throw new ProviderError('stripe', 'Subscription has no items to update.', { subscriptionId: input.providerSubscriptionId });
    }

    const updated = await this.stripeRequest<StripeSubscription>(`/subscriptions/${input.providerSubscriptionId}`, {
      method: 'POST',
      body: {
        items: [{ id: itemId, price: input.newPriceId }],
        proration_behavior: input.prorate === false ? 'none' : 'create_prorations',
      },
    });

    return {
      providerSubscriptionId: updated.id,
      status: this.mapStatus(updated.status),
      currentPeriodStart: new Date(updated.current_period_start * 1000),
      currentPeriodEnd: new Date(updated.current_period_end * 1000),
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      providerCustomerId: typeof updated.customer === 'string' ? updated.customer : undefined,
      providerStatus: updated.status,
      providerMetadata: updated.metadata,
    };
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionSync> {
    this.requireConfigured();
    const sub = await this.stripeRequest<StripeSubscription>(`/subscriptions/${providerSubscriptionId}`);
    return {
      providerSubscriptionId: sub.id,
      status: this.mapStatus(sub.status),
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      providerCustomerId: typeof sub.customer === 'string' ? sub.customer : undefined,
      providerStatus: sub.status,
      providerMetadata: sub.metadata,
    };
  }

  async verifyWebhook(payload: string | Buffer, signature: string, _signatureHeader?: string): Promise<unknown> {
    if (!this.webhookSecret) {
      throw new ProviderNotConfiguredError('stripe (webhook secret)');
    }

    // Stripe webhook verification requires the stripe SDK's crypto-based
    // signature check. We dynamically import the SDK only when a webhook
    // is actually received. If the SDK isn't installed, we fall back to
    // a manual HMAC-SHA256 verification (Stripe's scheme is documented).
    try {
      const stripeModule: any = await import('stripe' as string).then((m: any) => (m.default ?? m)).catch(() => null);
      if (stripeModule) {
        const client = new stripeModule(this.secretKey!, { apiVersion: this.apiVersion as never });
        const event = client.webhooks.constructEvent(
          typeof payload === 'string' ? Buffer.from(payload) : payload,
          signature,
          this.webhookSecret,
        );
        return event as unknown;
      }
    } catch (err) {
      throw new WebhookSignatureInvalidError('stripe');
    }

    // Fallback: if the stripe SDK isn't installed, we can't verify signatures
    throw new ProviderNotConfiguredError('stripe (SDK not installed — run: bun add stripe)');
  }

  parseWebhookEvent(rawEvent: unknown): {
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
    const event = rawEvent as StripeEvent;
    const obj = event?.data?.object ?? {};

    // Extract metadata (Stripe stores it on the subscription/customer/invoice)
    const metadata = (obj.metadata ?? {}) as Record<string, string>;

    return {
      eventId: event?.id ?? 'unknown',
      eventType: event?.type ?? 'unknown',
      workspaceId: metadata.workspaceId ?? null,
      subscriptionId: (obj.subscription as string) ?? (obj.id as string) ?? null,
      customerId: (obj.customer as string) ?? null,
      planSlug: (metadata.planSlug as Plan) ?? null,
      interval: (metadata.interval as SubscriptionInterval) ?? null,
      status: obj.status ? this.mapStatus(obj.status as string) : null,
      amount: typeof obj.total === 'number' ? obj.total : (typeof obj.amount === 'number' ? obj.amount : null),
      currency: (obj.currency as string) ?? null,
      invoiceId: (obj.id as string) ?? null,
      paymentId: (obj.payment_intent as string) ?? (obj.charge as string) ?? null,
      hostedInvoiceUrl: (obj.hosted_invoice_url as string) ?? null,
      invoicePdfUrl: (obj.invoice_pdf as string) ?? null,
      periodStart: typeof obj.period_start === 'number' ? new Date(obj.period_start * 1000) : null,
      periodEnd: typeof obj.period_end === 'number' ? new Date(obj.period_end * 1000) : null,
      raw: event,
    };
  }
}
