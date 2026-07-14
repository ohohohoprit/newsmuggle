/**
 * Webhook handler — receives raw webhook payloads, verifies signatures,
 * and routes them to the idempotent event handlers.
 *
 * This module is called by the /api/billing/webhook/stripe and
 * /api/billing/webhook/razorpay route handlers. Those handlers are
 * responsible for reading the raw body + signature header and passing
 * them here.
 */
import type { BillingProviderSlug, WebhookResult } from '@/lib/billing/types';
import { getProvider } from '@/lib/billing/providers';
import { processWebhookEvent } from '@/lib/billing/events';
import { WebhookSignatureInvalidError } from '@/lib/billing/errors';

/**
 * Process an incoming webhook.
 *
 * @param providerSlug  'stripe' | 'razorpay'
 * @param rawBody       The raw request body (string or Buffer)
 * @param signature     The signature from the webhook header
 * @param signatureHeader  The full signature header (Stripe uses this for timestamp+sig)
 */
export async function handleWebhook(
  providerSlug: BillingProviderSlug,
  rawBody: string | Buffer,
  signature: string,
  signatureHeader?: string,
): Promise<WebhookResult> {
  const provider = getProvider(providerSlug);

  // 1. Verify the webhook signature
  let rawEvent: unknown;
  try {
    rawEvent = await provider.verifyWebhook(rawBody, signature, signatureHeader);
  } catch (err) {
    if (err instanceof WebhookSignatureInvalidError) {
      return {
        received: true,
        eventId: null,
        eventType: null,
        processed: false,
        duplicate: false,
        error: err.message,
      };
    }
    throw err;
  }

  // 2. Parse the event into a normalized shape
  const normalized = provider.parseWebhookEvent(rawEvent);

  // 3. Process the event (idempotent)
  const result = await processWebhookEvent(providerSlug, {
    eventId: normalized.eventId,
    eventType: normalized.eventType,
    workspaceId: normalized.workspaceId,
    subscriptionId: normalized.subscriptionId,
    customerId: normalized.customerId,
    planSlug: normalized.planSlug,
    interval: normalized.interval,
    status: normalized.status,
    amount: normalized.amount,
    currency: normalized.currency,
    invoiceId: normalized.invoiceId,
    paymentId: normalized.paymentId,
    hostedInvoiceUrl: normalized.hostedInvoiceUrl,
    invoicePdfUrl: normalized.invoicePdfUrl,
    periodStart: normalized.periodStart,
    periodEnd: normalized.periodEnd,
    raw: normalized.raw,
  });

  return {
    received: true,
    eventId: normalized.eventId,
    eventType: normalized.eventType as WebhookResult['eventType'],
    processed: result.processed,
    duplicate: result.duplicate,
    error: result.error,
  };
}
