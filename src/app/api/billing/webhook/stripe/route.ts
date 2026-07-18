import { NextResponse } from 'next/server';
import { handleWebhook } from '@/lib/billing/webhooks';
import { WebhookSignatureInvalidError } from '@/lib/billing/errors';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/webhook/stripe
 * Stripe webhook receiver. Reads the raw body + Stripe-Signature header,
 * verifies the signature, and processes the event idempotently.
 *
 * Required env: STRIPE_WEBHOOK_SECRET
 *
 * The route handler returns 200 immediately for valid webhooks (even if
 * processing fails internally) to prevent Stripe from retrying. Errors
 * are recorded in the BillingEvent table for debugging.
 */
export async function POST(req: Request) {
  // Stripe requires the raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  if (!signature) {
    return NextResponse.json(
      { received: false, error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  try {
    const result = await handleWebhook('stripe', rawBody, signature, signature);

    // Stripe expects a 200 for successfully received webhooks, even for replays
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof WebhookSignatureInvalidError) {
      return NextResponse.json(
        { received: true, processed: false, error: err.message },
        { status: 401 },
      );
    }
    console.error('[stripe webhook] error:', err);
    return NextResponse.json(
      { received: true, processed: false, error: 'Internal error processing webhook' },
      { status: 200 }, // 200 to prevent retries (we've recorded the failure)
    );
  }
}
