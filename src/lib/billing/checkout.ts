/**
 * Checkout service — creates checkout sessions via the active provider.
 *
 * For Stripe: creates a Checkout Session (hosted page).
 * For Razorpay: creates a Subscription (frontend uses the ID to open the modal).
 * For Manual: returns a confirmation URL that activates the subscription directly.
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/auth';
import { requireMembership } from '@/lib/workspace';
import type { Plan } from '@/lib/rbac';
import type { CheckoutRequest, CheckoutSession, SubscriptionInterval } from '@/lib/billing/types';
import { getConfiguredProvider, getConfiguredProviderSlug } from '@/lib/billing/providers';
import { getPlanBySlug } from '@/lib/billing/plans';
import { upsertSubscription } from '@/lib/billing/subscription';
import {
  BillingError,
  BillingValidationError,
  WorkspaceNotBillableError,
} from '@/lib/billing/errors';

const TRIAL_DAYS_DEFAULT = 14;

function resolvePriceId(plan: {
  slug: Plan;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  razorpayPlanIdMonthly: string | null;
  razorpayPlanIdYearly: string | null;
}, interval: SubscriptionInterval, provider: 'stripe' | 'razorpay' | 'none'): string | null {
  if (provider === 'stripe') {
    return interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
  }
  if (provider === 'razorpay') {
    return interval === 'yearly' ? plan.razorpayPlanIdYearly : plan.razorpayPlanIdMonthly;
  }
  return null; // manual provider doesn't need a price ID
}

/**
 * Create a checkout session for a plan upgrade/subscription.
 *
 * The caller must be an active member of the workspace (verified via
 * requireMembership). Only workspace owners/admins can create checkouts.
 */
export async function createCheckout(
  input: CheckoutRequest,
  ctx: { userId: string },
  req: Request,
): Promise<CheckoutSession> {
  // 1. Resolve workspace
  let workspaceId = input.workspaceId;
  if (!workspaceId) {
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { activeWorkspaceId: true },
    });
    workspaceId = user?.activeWorkspaceId ?? undefined;
  }
  if (!workspaceId) {
    throw new BillingError('NO_ACTIVE_WORKSPACE', 'You do not have an active workspace.', 400);
  }

  // 2. Verify workspace access (owner or admin only)
  const membership = await requireMembership(workspaceId, ctx.userId);
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new WorkspaceNotBillableError(workspaceId);
  }

  // 3. Resolve plan
  const plan = await getPlanBySlug(input.planSlug);

  // 4. Resolve provider
  const requestedProvider = input.provider ?? getConfiguredProviderSlug();
  const provider = getConfiguredProvider();

  // If the requested provider differs from the configured one, use the
  // configured one (we don't support per-request provider switching yet)
  if (requestedProvider !== provider.slug) {
    // Allow explicit 'none' to override
    if (requestedProvider !== 'none') {
      // Use the configured provider
    }
  }

  // 5. Resolve price ID
  const priceId = resolvePriceId(plan, input.interval, provider.slug);

  // For paid plans with the manual provider, we still allow checkout
  // (useful for dev/testing). For paid plans with a real provider, the
  // price ID must be configured.
  if (!priceId && provider.slug !== 'none' && plan.priceMonthly > 0) {
    throw new BillingError(
      'PRICE_ID_NOT_CONFIGURED',
      `No ${provider.slug} price ID configured for plan "${plan.slug}" (${input.interval}). Set the ${provider.slug === 'stripe' ? 'STRIPE_PRICE' : 'RAZORPAY_PLAN'}_${plan.slug.toUpperCase()}_${input.interval.toUpperCase()} env var.`,
      503,
      { planSlug: plan.slug, interval: input.interval, provider: provider.slug },
    );
  }

  // 6. Resolve URLs
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000';
  const successUrl = input.successUrl ?? `${baseUrl}/api/billing/checkout/success?workspace=${workspaceId}&plan=${plan.slug}&interval=${input.interval}`;
  const cancelUrl = input.cancelUrl ?? `${baseUrl}/api/billing/checkout/cancel?workspace=${workspaceId}`;

  // 7. Get workspace + customer info
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: { owner: { select: { email: true, name: true } } },
  });
  if (!workspace) {
    throw new BillingError('WORKSPACE_NOT_FOUND', 'Workspace not found.', 404);
  }

  // 8. Create checkout session via provider
  const session = await provider.createCheckout({
    workspaceId,
    workspaceName: workspace.name,
    customerEmail: workspace.owner.email,
    planSlug: plan.slug,
    interval: input.interval,
    successUrl,
    cancelUrl,
    priceId,
    metadata: {
      userId: ctx.userId,
      workspaceOwnerId: workspace.ownerId,
    },
  });

  // 9. For manual provider, create the subscription immediately (no payment)
  if (provider.slug === 'none') {
    await upsertSubscription(
      workspaceId,
      plan.slug,
      {
        status: plan.priceMonthly === 0 ? 'active' : 'trialing',
        interval: input.interval,
        provider: 'none',
        providerSubscriptionId: session.sessionId,
        trialDays: plan.priceMonthly > 0 ? TRIAL_DAYS_DEFAULT : 0,
      },
      req,
      ctx.userId,
    );
  }

  await auditLog('billing_checkout_created', ctx.userId, req, 'success', {
    workspaceId,
    planSlug: plan.slug,
    interval: input.interval,
    provider: provider.slug,
    sessionId: session.sessionId,
  });

  return session;
}
