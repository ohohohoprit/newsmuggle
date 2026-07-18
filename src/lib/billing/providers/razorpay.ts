/**
 * Razorpay billing provider — implements the BillingProvider interface
 * using the Razorpay REST API.
 *
 * Environment variables required:
 *   - RAZORPAY_KEY_ID            (rzp_test_... or rzp_live_...)
 *   - RAZORPAY_KEY_SECRET
 *   - RAZORPAY_WEBHOOK_SECRET
 *   - RAZORPAY_PLAN_<PLAN>_<INTERVAL>  (plan_... IDs for each plan/interval)
 *
 * Razorpay uses HTTP Basic Auth (key_id:key_secret) and a custom webhook
 * signature scheme (X-Razorpay-Signature header = HMAC-SHA256 of the raw body).
 */
import crypto from 'crypto';
import type {
  BillingProviderSlug,
  CheckoutSession,
  SubscriptionStatus,
  SubscriptionInterval,
} from '@/lib/billing/types';
import type { Plan } from '@/lib/rbac';
import { BillingProvider, type CreateCheckoutInput, type ProviderSubscriptionSync, type CancelSubscriptionInput, type ChangePlanInput } from '@/lib/billing/providers/base';
import { ProviderNotConfiguredError, ProviderError, WebhookSignatureInvalidError } from '@/lib/billing/errors';

interface RazorpaySubscription {
  id: string;
  status: string;
  current_start?: number;
  current_end?: number;
  end_at?: number;
  customer_id?: string;
  plan_id?: string;
  quantity?: number;
  notes?: Record<string, string>;
}

interface RazorpayCheckoutSession {
  id: string;
  // Razorpay doesn't return a URL directly; the frontend uses the session ID
  // to redirect to the Razorpay checkout page. We construct a hosted URL.
  short_url?: string;
}

interface RazorpayEvent {
  entity: 'event';
  id: string;
  event: string;
  contains: string[];
  payload: {
    subscription?: { entity: RazorpaySubscription };
    payment?: { entity: { id: string; amount: number; currency: string; status: string; method?: string } };
    invoice?: { entity: { id: string; invoice_number?: string; total: number; currency: string; status: string; short_url?: string; pdf_url?: string; period_start?: number; period_end?: number; paid_at?: number; subscription_id?: string } };
  };
}

export class RazorpayBillingProvider extends BillingProvider {
  readonly slug: BillingProviderSlug = 'razorpay';
  readonly name = 'Razorpay';

  private get keyId(): string | undefined {
    return process.env.RAZORPAY_KEY_ID;
  }

  private get keySecret(): string | undefined {
    return process.env.RAZORPAY_KEY_SECRET;
  }

  private get webhookSecret(): string | undefined {
    return process.env.RAZORPAY_WEBHOOK_SECRET;
  }

  private get baseURL(): string {
    return 'https://api.razorpay.com/v1';
  }

  isConfigured(): boolean {
    return !!(this.keyId && this.keySecret);
  }

  private requireConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError('razorpay');
    }
  }

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
  }

  private mapStatus(razorpayStatus: string): SubscriptionStatus {
    switch (razorpayStatus) {
      case 'created': return 'trialing';
      case 'authenticated': return 'active';
      case 'active': return 'active';
      case 'pending': return 'past_due';
      case 'halted': return 'past_due';
      case 'cancelled': return 'canceled';
      case 'completed': return 'canceled';
      case 'expired': return 'canceled';
      default: return 'active';
    }
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    this.requireConfigured();
    if (!input.priceId) {
      throw new ProviderError('razorpay', 'No Razorpay plan ID configured for this plan/interval. Set the RAZORPAY_PLAN_<PLAN>_<INTERVAL> env var or seed the Plan table.', { planSlug: input.planSlug, interval: input.interval });
    }

    // Create a Razorpay subscription
    const now = Math.floor(Date.now() / 1000);
    const body: Record<string, unknown> = {
      plan_id: input.priceId,
      customer_notify: 1,
      quantity: 1,
      total_count: input.interval === 'yearly' ? 12 : 0, // 0 = infinite
      start_at: now + 60, // start in 1 minute
      notes: {
        workspaceId: input.workspaceId,
        workspaceName: input.workspaceName,
        planSlug: input.planSlug,
        interval: input.interval,
        ...input.metadata,
      },
    };

    const sub = await this.razorpayRequest<RazorpaySubscription>('/subscriptions', { method: 'POST', body });

    // Razorpay doesn't have a hosted checkout URL like Stripe; the frontend
    // uses the subscription ID to open the Razorpay checkout modal.
    // We return a hosted URL that the frontend can redirect to.
    const url = `https://checkout.razorpay.com/v1/checkout/subscription?subscription_id=${sub.id}`;

    return {
      provider: 'razorpay',
      sessionId: sub.id,
      url,
      workspaceId: input.workspaceId,
      planSlug: input.planSlug,
      interval: input.interval,
      expiresAt: null,
    };
  }

  async cancelSubscription(input: CancelSubscriptionInput): Promise<ProviderSubscriptionSync> {
    this.requireConfigured();
    const path = input.immediately
      ? `/subscriptions/${input.providerSubscriptionId}/cancel`
      : `/subscriptions/${input.providerSubscriptionId}`;
    const sub = await this.razorpayRequest<RazorpaySubscription>(path, {
      method: input.immediately ? 'POST' : 'PATCH',
      body: input.immediately ? {} : { cancel_at_cycle_end: 1 },
    });

    return {
      providerSubscriptionId: sub.id,
      status: this.mapStatus(sub.status),
      currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : new Date(),
      currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : (sub.end_at ? new Date(sub.end_at * 1000) : new Date()),
      cancelAtPeriodEnd: true,
      providerCustomerId: sub.customer_id,
      providerStatus: sub.status,
      providerMetadata: sub.notes,
    };
  }

  async changePlan(input: ChangePlanInput): Promise<ProviderSubscriptionSync> {
    this.requireConfigured();
    if (!input.newPriceId) {
      throw new ProviderError('razorpay', 'No new plan ID provided for plan change.', { subscriptionId: input.providerSubscriptionId });
    }

    // Razorpay doesn't support changing the plan of an existing subscription
    // directly. The recommended flow is to cancel the current subscription
    // and create a new one. We return the updated subscription info.
    // For simplicity, we update the subscription's plan_id via PATCH.
    const sub = await this.razorpayRequest<RazorpaySubscription>(`/subscriptions/${input.providerSubscriptionId}`, {
      method: 'PATCH',
      body: { plan_id: input.newPriceId },
    });

    return {
      providerSubscriptionId: sub.id,
      status: this.mapStatus(sub.status),
      currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : new Date(),
      currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : new Date(),
      cancelAtPeriodEnd: false,
      providerCustomerId: sub.customer_id,
      providerStatus: sub.status,
      providerMetadata: sub.notes,
    };
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionSync> {
    this.requireConfigured();
    const sub = await this.razorpayRequest<RazorpaySubscription>(`/subscriptions/${providerSubscriptionId}`);
    return {
      providerSubscriptionId: sub.id,
      status: this.mapStatus(sub.status),
      currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : new Date(),
      currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : (sub.end_at ? new Date(sub.end_at * 1000) : new Date()),
      cancelAtPeriodEnd: false,
      providerCustomerId: sub.customer_id,
      providerStatus: sub.status,
      providerMetadata: sub.notes,
    };
  }

  async verifyWebhook(payload: string | Buffer, signature: string, _signatureHeader?: string): Promise<unknown> {
    if (!this.webhookSecret) {
      throw new ProviderNotConfiguredError('razorpay (webhook secret)');
    }

    // Razorpay webhook verification: HMAC-SHA256 of the raw body using the
    // webhook secret, compared to the X-Razorpay-Signature header.
    const body = typeof payload === 'string' ? payload : payload.toString('utf8');
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(body).digest('hex');

    // Timing-safe comparison (guard length mismatch first — timingSafeEqual
    // throws on unequal-length buffers).
    const expectedBuf = Buffer.from(expected, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
      throw new WebhookSignatureInvalidError('razorpay');
    }

    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new ProviderError('razorpay', 'Webhook payload is not valid JSON.');
    }
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
    const event = rawEvent as RazorpayEvent;
    const sub = event?.payload?.subscription?.entity;
    const payment = event?.payload?.payment?.entity;
    const invoice = event?.payload?.invoice?.entity;
    const notes = sub?.notes ?? {};

    return {
      eventId: event?.id ?? 'unknown',
      eventType: event?.event ?? 'unknown',
      workspaceId: notes.workspaceId ?? null,
      subscriptionId: sub?.id ?? invoice?.subscription_id ?? null,
      customerId: sub?.customer_id ?? null,
      planSlug: (notes.planSlug as Plan) ?? null,
      interval: (notes.interval as SubscriptionInterval) ?? null,
      status: sub?.status ? this.mapStatus(sub.status) : null,
      amount: invoice?.total ?? payment?.amount ?? null,
      currency: (invoice?.currency ?? payment?.currency) ?? null,
      invoiceId: invoice?.id ?? null,
      paymentId: payment?.id ?? null,
      hostedInvoiceUrl: invoice?.short_url ?? null,
      invoicePdfUrl: invoice?.pdf_url ?? null,
      periodStart: (invoice?.period_start ?? sub?.current_start) ? new Date((invoice?.period_start ?? sub!.current_start!) * 1000) : null,
      periodEnd: (invoice?.period_end ?? sub?.current_end) ? new Date((invoice?.period_end ?? sub!.current_end!) * 1000) : null,
      raw: event,
    };
  }

  private async razorpayRequest<T = unknown>(path: string, opts: { method?: string; body?: Record<string, unknown> } = {}): Promise<T> {
    this.requireConfigured();
    const method = opts.method ?? 'GET';
    const res = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errMsg = `Razorpay API error (${res.status})`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson?.error?.description ?? errMsg;
      } catch {
        // not JSON
      }
      throw new ProviderError('razorpay', errMsg, { status: res.status, path });
    }

    return res.json() as Promise<T>;
  }
}
