import { NextResponse } from 'next/server';
import { handleWebhook } from '@/lib/billing/webhooks';
import { WebhookSignatureInvalidError } from '@/lib/billing/errors';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/webhook/razorpay
 * Razorpay webhook receiver. Reads the raw body + X-Razorpay-Signature
 * header, verifies the signature, and processes the event idempotently.
 *
 * Required env: RAZORPAY_WEBHOOK_SECRET
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!signature) {
    return NextResponse.json(
      { received: false, error: 'Missing x-razorpay-signature header' },
      { status: 400 },
    );
  }

  try {
    const result = await handleWebhook('razorpay', rawBody, signature, signature);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof WebhookSignatureInvalidError) {
      return NextResponse.json(
        { received: true, processed: false, error: err.message },
        { status: 401 },
      );
    }
    console.error('[razorpay webhook] error:', err);
    return NextResponse.json(
      { received: true, processed: false, error: 'Internal error processing webhook' },
      { status: 200 },
    );
  }
}
