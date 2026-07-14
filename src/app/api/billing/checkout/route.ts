import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { createCheckout } from '@/lib/billing/checkout';
import { BillingError, BillingValidationError } from '@/lib/billing/errors';
import { validatePlanSlug, validateInterval, validateProvider, validateUrl, validateWorkspaceId } from '@/lib/billing/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/checkout
 * Create a checkout session for a plan subscription/upgrade.
 *
 * Body:
 *   - planSlug: 'starter' | 'creator' | 'agency'  (required)
 *   - interval: 'monthly' | 'yearly'              (default: monthly)
 *   - provider: 'stripe' | 'razorpay' | 'none'    (optional: override env config)
 *   - successUrl?: string                          (https or relative path)
 *   - cancelUrl?: string                           (https or relative path)
 *   - workspaceId?: string                         (optional: use specific workspace)
 *
 * Returns: { provider, sessionId, url, workspaceId, planSlug, interval, expiresAt }
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const planSlug = validatePlanSlug(body.planSlug);
    const interval = validateInterval(body.interval);
    const provider = validateProvider(body.provider);
    const successUrl = validateUrl(body.successUrl, 'successUrl');
    const cancelUrl = validateUrl(body.cancelUrl, 'cancelUrl');
    const workspaceId = validateWorkspaceId(body.workspaceId);

    const session = await createCheckout(
      {
        planSlug,
        interval,
        ...(provider ? { provider } : {}),
        ...(successUrl ? { successUrl } : {}),
        ...(cancelUrl ? { cancelUrl } : {}),
        ...(workspaceId ? { workspaceId } : {}),
      },
      { userId: auth.user!.id },
      req,
    );

    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    if (err instanceof BillingError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    if (err instanceof BillingValidationError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Checkout failed.';
    return NextResponse.json({ error: 'CHECKOUT_ERROR', message }, { status: 500 });
  }
}
