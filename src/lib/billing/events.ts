/**
 * Billing event handlers — idempotent processing of billing events.
 *
 * Every webhook event is recorded as a BillingEvent row with a unique
 * constraint on [provider, providerEventId]. This ensures that if a
 * webhook is delivered more than once (which providers do), we process
 * it exactly once.
 *
 * Event types handled:
 *   - subscription_created      → create subscription in DB
 *   - subscription_renewed      → extend period + reset quota
 *   - subscription_upgraded     → update plan + entitlements
 *   - subscription_downgraded   → schedule plan change at period end
 *   - subscription_canceled     → mark subscription canceled
 *   - payment_succeeded         → create/update invoice
 *   - payment_failed            → mark subscription past_due
 *   - invoice_generated         → create invoice record
 *   - quota_reset               → reset monthly quota
 *   - usage_threshold_reached   → create notification
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/auth';
import type { BillingEventType, BillingProviderSlug, SubscriptionStatus, SubscriptionInterval } from '@/lib/billing/types';
import type { Plan } from '@/lib/rbac';
import { upsertSubscription, cancelSubscription, changePlan, getSubscription } from '@/lib/billing/subscription';
import { createInvoice, updateInvoiceStatus } from '@/lib/billing/invoices';
import { resetQuota } from '@/lib/billing/quota';
import { getPlanBySlug } from '@/lib/billing/plans';
import { BillingError } from '@/lib/billing/errors';

// ===== Idempotency =====

/**
 * Check if an event has already been processed. If so, return the existing
 * record (idempotent — caller should treat this as success).
 */
export async function findExistingEvent(provider: BillingProviderSlug, providerEventId: string) {
  return db.billingEvent.findUnique({
    where: {
      provider_providerEventId: { provider, providerEventId },
    },
  });
}

/**
 * Record a new billing event (or mark an existing one as processing).
 * Returns the event record + whether this is a new event (true) or a
 * replay (false).
 */
export async function recordEvent(input: {
  workspaceId: string;
  userId?: string | null;
  type: BillingEventType | string;
  provider: BillingProviderSlug | string | null;
  providerEventId: string;
  payload: unknown;
}): Promise<{ event: { id: string; status: string }; isNew: boolean }> {
  const existing = await db.billingEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: (input.provider ?? 'none') as string,
        providerEventId: input.providerEventId,
      },
    },
  });

  if (existing) {
    return { event: existing, isNew: false };
  }

  const event = await db.billingEvent.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      type: input.type,
      provider: (input.provider ?? 'none') as string,
      providerEventId: input.providerEventId,
      status: 'processing',
      payload: JSON.stringify(input.payload ?? {}),
    },
  });

  return { event, isNew: true };
}

/**
 * Mark an event as processed (or failed).
 */
export async function completeEvent(
  eventId: string,
  status: 'processed' | 'failed' = 'processed',
  errorMessage?: string,
): Promise<void> {
  await db.billingEvent.update({
    where: { id: eventId },
    data: {
      status,
      errorMessage: errorMessage ?? null,
      processedAt: new Date(),
    },
  });
}

// ===== Event handlers =====

export interface NormalizedWebhookEvent {
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
}

/**
 * Process a normalized webhook event. Idempotent — if the event was
 * already processed, returns immediately.
 */
export async function processWebhookEvent(
  provider: BillingProviderSlug,
  normalized: NormalizedWebhookEvent,
  req?: Request,
  userId?: string,
): Promise<{ processed: boolean; duplicate: boolean; error?: string }> {
  if (!normalized.workspaceId) {
    // Can't process without a workspace ID (no metadata)
    return { processed: false, duplicate: false, error: 'No workspaceId in event metadata' };
  }

  // Idempotency check
  const existing = await findExistingEvent(provider, normalized.eventId);
  if (existing && existing.status === 'processed') {
    return { processed: false, duplicate: true };
  }

  // Record the event
  const { event, isNew } = await recordEvent({
    workspaceId: normalized.workspaceId,
    userId,
    type: mapEventType(normalized.eventType, provider),
    provider,
    providerEventId: normalized.eventId,
    payload: normalized.raw,
  });

  if (!isNew) {
    return { processed: false, duplicate: true };
  }

  // Process the event
  try {
    await handleEvent(normalized, provider, req, userId);
    await completeEvent(event.id, 'processed');
    return { processed: true, duplicate: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error processing event';
    await completeEvent(event.id, 'failed', message);
    return { processed: false, duplicate: false, error: message };
  }
}

function mapEventType(providerEventType: string, provider: BillingProviderSlug): BillingEventType {
  const mapping: Record<string, BillingEventType> = {};

  if (provider === 'stripe') {
    mapping['customer.subscription.created'] = 'subscription_created';
    mapping['customer.subscription.updated'] = 'subscription_renewed'; // generic; refined in handler
    mapping['customer.subscription.deleted'] = 'subscription_canceled';
    mapping['invoice.payment_succeeded'] = 'payment_succeeded';
    mapping['invoice.payment_failed'] = 'payment_failed';
    mapping['invoice.created'] = 'invoice_generated';
  } else if (provider === 'razorpay') {
    mapping['subscription.created'] = 'subscription_created';
    mapping['subscription.authenticated'] = 'subscription_created';
    mapping['subscription.activated'] = 'subscription_renewed';
    mapping['subscription.charged'] = 'payment_succeeded';
    mapping['subscription.cancelled'] = 'subscription_canceled';
    mapping['subscription.halted'] = 'payment_failed';
    mapping['invoice.paid'] = 'payment_succeeded';
    mapping['invoice.expired'] = 'payment_failed';
  }

  return mapping[providerEventType] ?? 'subscription_renewed'; // default
}

async function handleEvent(
  normalized: NormalizedWebhookEvent,
  provider: BillingProviderSlug,
  req?: Request,
  userId?: string,
): Promise<void> {
  if (!normalized.workspaceId) return;

  const eventType = mapEventType(normalized.eventType, provider);

  switch (eventType) {
    case 'subscription_created':
      await handleSubscriptionCreated(normalized, provider, req, userId);
      break;
    case 'subscription_renewed':
      await handleSubscriptionRenewed(normalized, provider, req, userId);
      break;
    case 'subscription_upgraded':
      await handleSubscriptionUpgraded(normalized, provider, req, userId);
      break;
    case 'subscription_downgraded':
      await handleSubscriptionDowngraded(normalized, provider, req, userId);
      break;
    case 'subscription_canceled':
      await handleSubscriptionCanceled(normalized, provider, req, userId);
      break;
    case 'payment_succeeded':
      await handlePaymentSucceeded(normalized, provider, req, userId);
      break;
    case 'payment_failed':
      await handlePaymentFailed(normalized, provider, req, userId);
      break;
    case 'invoice_generated':
      await handleInvoiceGenerated(normalized, provider, req, userId);
      break;
    case 'quota_reset':
      await handleQuotaReset(normalized, req, userId);
      break;
    case 'usage_threshold_reached':
      await handleUsageThreshold(normalized, req, userId);
      break;
  }
}

async function handleSubscriptionCreated(normalized: NormalizedWebhookEvent, provider: BillingProviderSlug, req?: Request, userId?: string) {
  if (!normalized.workspaceId || !normalized.planSlug) return;
  await upsertSubscription(
    normalized.workspaceId,
    normalized.planSlug,
    {
      status: normalized.status ?? 'trialing',
      interval: normalized.interval ?? 'monthly',
      provider,
      providerSubscriptionId: normalized.subscriptionId ?? undefined,
      providerCustomerId: normalized.customerId ?? undefined,
      providerStatus: normalized.status ?? undefined,
      currentPeriodStart: normalized.periodStart ?? undefined,
      currentPeriodEnd: normalized.periodEnd ?? undefined,
    },
    req,
    userId,
  );
}

async function handleSubscriptionRenewed(normalized: NormalizedWebhookEvent, provider: BillingProviderSlug, req?: Request, userId?: string) {
  if (!normalized.workspaceId) return;

  // If the event includes a plan slug, it might be an upgrade/downgrade
  if (normalized.planSlug) {
    const existing = await getSubscription(normalized.workspaceId);
    if (existing && existing.plan.slug !== normalized.planSlug) {
      // Plan changed — check if upgrade or downgrade
      const newPlan = await getPlanBySlug(normalized.planSlug);
      if (newPlan.sortOrder > existing.plan.sortOrder) {
        await handleSubscriptionUpgraded(normalized, provider, req, userId);
        return;
      } else if (newPlan.sortOrder < existing.plan.sortOrder) {
        await handleSubscriptionDowngraded(normalized, provider, req, userId);
        return;
      }
    }
  }

  // Simple renewal — extend the period + reset quota
  if (normalized.planSlug && normalized.periodStart && normalized.periodEnd) {
    await upsertSubscription(
      normalized.workspaceId,
      normalized.planSlug,
      {
        status: 'active',
        interval: normalized.interval ?? 'monthly',
        provider,
        providerSubscriptionId: normalized.subscriptionId ?? undefined,
        providerCustomerId: normalized.customerId ?? undefined,
        currentPeriodStart: normalized.periodStart,
        currentPeriodEnd: normalized.periodEnd,
      },
      req,
      userId,
    );

    // Reset the monthly quota
    await resetQuota(normalized.workspaceId, normalized.periodStart, normalized.periodEnd);
  }

  if (req && userId) {
    await auditLog('subscription_renewed', userId, req, 'success', {
      workspaceId: normalized.workspaceId,
      subscriptionId: normalized.subscriptionId,
    });
  }
}

async function handleSubscriptionUpgraded(normalized: NormalizedWebhookEvent, provider: BillingProviderSlug, req?: Request, userId?: string) {
  if (!normalized.workspaceId || !normalized.planSlug) return;
  await changePlan(
    normalized.workspaceId,
    normalized.planSlug,
    {
      interval: normalized.interval ?? 'monthly',
      provider,
      providerSubscriptionId: normalized.subscriptionId ?? null,
      prorate: true,
    },
    req,
    userId,
  );
}

async function handleSubscriptionDowngraded(normalized: NormalizedWebhookEvent, provider: BillingProviderSlug, req?: Request, userId?: string) {
  if (!normalized.workspaceId || !normalized.planSlug) return;
  await changePlan(
    normalized.workspaceId,
    normalized.planSlug,
    {
      interval: normalized.interval ?? 'monthly',
      provider,
      providerSubscriptionId: normalized.subscriptionId ?? null,
      prorate: false,
    },
    req,
    userId,
  );
}

async function handleSubscriptionCanceled(normalized: NormalizedWebhookEvent, provider: BillingProviderSlug, req?: Request, userId?: string) {
  if (!normalized.workspaceId) return;
  await cancelSubscription(
    normalized.workspaceId,
    { immediately: !normalized.periodEnd || normalized.periodEnd < new Date() },
    req,
    userId,
  );
}

async function handlePaymentSucceeded(normalized: NormalizedWebhookEvent, provider: BillingProviderSlug, req?: Request, userId?: string) {
  if (!normalized.workspaceId) return;

  // Create/update the invoice
  if (normalized.invoiceId || normalized.amount) {
    await createInvoice({
      workspaceId: normalized.workspaceId,
      userId,
      amount: normalized.amount ?? 0,
      currency: normalized.currency ?? 'usd',
      status: 'paid',
      provider,
      providerInvoiceId: normalized.invoiceId,
      providerPaymentId: normalized.paymentId,
      hostedInvoiceUrl: normalized.hostedInvoiceUrl,
      invoicePdfUrl: normalized.invoicePdfUrl,
      periodStart: normalized.periodStart,
      periodEnd: normalized.periodEnd,
      paidAt: new Date(),
    });
  }

  // Ensure subscription is active
  if (normalized.planSlug) {
    await upsertSubscription(
      normalized.workspaceId,
      normalized.planSlug,
      {
        status: 'active',
        interval: normalized.interval ?? 'monthly',
        provider,
        providerSubscriptionId: normalized.subscriptionId ?? undefined,
        providerCustomerId: normalized.customerId ?? undefined,
        currentPeriodStart: normalized.periodStart ?? undefined,
        currentPeriodEnd: normalized.periodEnd ?? undefined,
      },
      req,
      userId,
    );
  }

  if (req && userId) {
    await auditLog('payment_succeeded', userId, req, 'success', {
      workspaceId: normalized.workspaceId,
      amount: normalized.amount,
      currency: normalized.currency,
      paymentId: normalized.paymentId,
    });
  }
}

async function handlePaymentFailed(normalized: NormalizedWebhookEvent, provider: BillingProviderSlug, req?: Request, userId?: string) {
  if (!normalized.workspaceId) return;

  // Mark subscription as past_due
  const existing = await getSubscription(normalized.workspaceId);
  if (existing) {
    await upsertSubscription(
      normalized.workspaceId,
      existing.plan.slug,
      {
        status: 'past_due',
        interval: existing.interval,
        provider,
        providerSubscriptionId: existing.providerSubscriptionId ?? undefined,
        providerCustomerId: existing.provider ?? undefined,
      },
      req,
      userId,
    );
  }

  // Create an invoice record for the failed payment
  if (normalized.invoiceId || normalized.amount) {
    await createInvoice({
      workspaceId: normalized.workspaceId,
      userId,
      amount: normalized.amount ?? 0,
      currency: normalized.currency ?? 'usd',
      status: 'open',
      provider,
      providerInvoiceId: normalized.invoiceId,
      providerPaymentId: normalized.paymentId,
      periodStart: normalized.periodStart,
      periodEnd: normalized.periodEnd,
    });
  }

  if (req && userId) {
    await auditLog('payment_failed', userId, req, 'failed', {
      workspaceId: normalized.workspaceId,
      amount: normalized.amount,
      currency: normalized.currency,
    });
  }
}

async function handleInvoiceGenerated(normalized: NormalizedWebhookEvent, provider: BillingProviderSlug, req?: Request, userId?: string) {
  if (!normalized.workspaceId || !normalized.invoiceId) return;
  await createInvoice({
    workspaceId: normalized.workspaceId,
    userId,
    amount: normalized.amount ?? 0,
    currency: normalized.currency ?? 'usd',
    status: 'open',
    provider,
    providerInvoiceId: normalized.invoiceId,
    hostedInvoiceUrl: normalized.hostedInvoiceUrl,
    invoicePdfUrl: normalized.invoicePdfUrl,
    periodStart: normalized.periodStart,
    periodEnd: normalized.periodEnd,
  });
}

async function handleQuotaReset(normalized: NormalizedWebhookEvent, req?: Request, userId?: string) {
  if (!normalized.workspaceId || !normalized.periodStart || !normalized.periodEnd) return;
  await resetQuota(normalized.workspaceId, normalized.periodStart, normalized.periodEnd);
  if (req && userId) {
    await auditLog('quota_reset', userId, req, 'success', {
      workspaceId: normalized.workspaceId,
      periodStart: normalized.periodStart,
      periodEnd: normalized.periodEnd,
    });
  }
}

async function handleUsageThreshold(normalized: NormalizedWebhookEvent, req?: Request, userId?: string) {
  if (!normalized.workspaceId) return;
  // Create a notification for the workspace owner
  const workspace = await db.workspace.findUnique({
    where: { id: normalized.workspaceId },
    select: { ownerId: true, name: true },
  });
  if (workspace) {
    await db.notification.create({
      data: {
        userId: workspace.ownerId,
        type: 'usage_threshold_reached',
        title: 'Usage Threshold Reached',
        message: `Your workspace "${workspace.name}" has reached a usage threshold. Consider upgrading your plan.`,
        actionUrl: '/api/billing/status',
      },
    });
  }
}
