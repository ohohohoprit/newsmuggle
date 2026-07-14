/**
 * Subscription service — manages the subscription lifecycle for a workspace.
 *
 * A workspace has at most ONE subscription (unique constraint on
 * workspaceId). This module handles:
 *   - resolving the current subscription + plan + entitlements
 *   - creating a subscription (manual or provider-backed)
 *   - activating/canceling/reactivating subscriptions
 *   - plan upgrades + downgrades (with proration)
 *   - syncing provider state into our DB
 *
 * The tool engine and AI service call `resolveEntitlements()` to get the
 * effective plan limits for a workspace before each generation.
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/auth';
import type { Plan } from '@/lib/rbac';
import type {
  SubscriptionDTO,
  SubscriptionStatus,
  SubscriptionInterval,
  PlanDTO,
  PlanEntitlements,
  BillingProviderSlug,
} from '@/lib/billing/types';
import { getPlanBySlug, getSeedEntitlements } from '@/lib/billing/plans';
import {
  SubscriptionNotFoundError,
  SubscriptionInactiveError,
  BillingError,
} from '@/lib/billing/errors';

// ===== Helpers =====

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toSubscriptionDTO(sub: {
  id: string;
  workspaceId: string;
  status: string;
  interval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEnd: Date | null;
  provider: string | null;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  plan: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    priceMonthly: number;
    priceYearly: number;
    currency: string;
    maxGenerations: number;
    maxTools: number;
    maxStorage: number;
    teamSeats: number;
    apiAccess: boolean;
    whiteLabel: boolean;
    features: string | null;
    isPublic: boolean;
    isActive: boolean;
    sortOrder: number;
    stripePriceIdMonthly: string | null;
    stripePriceIdYearly: string | null;
    razorpayPlanIdMonthly: string | null;
    razorpayPlanIdYearly: string | null;
  };
}): SubscriptionDTO {
  const plan = sub.plan;
  return {
    id: sub.id,
    workspaceId: sub.workspaceId,
    plan: {
      id: plan.id,
      slug: plan.slug as Plan,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly / 100,
      priceYearly: plan.priceYearly / 100,
      currency: plan.currency,
      maxGenerations: plan.maxGenerations,
      maxTools: plan.maxTools,
      maxStorage: plan.maxStorage,
      teamSeats: plan.teamSeats,
      apiAccess: plan.apiAccess,
      whiteLabel: plan.whiteLabel,
      features: safeParseJson<Record<string, unknown> | null>(plan.features, null),
      isPublic: plan.isPublic,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      stripePriceIdMonthly: plan.stripePriceIdMonthly,
      stripePriceIdYearly: plan.stripePriceIdYearly,
      razorpayPlanIdMonthly: plan.razorpayPlanIdMonthly,
      razorpayPlanIdYearly: plan.razorpayPlanIdYearly,
    },
    status: sub.status as SubscriptionStatus,
    interval: sub.interval as SubscriptionInterval,
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    canceledAt: sub.canceledAt?.toISOString() ?? null,
    trialEnd: sub.trialEnd?.toISOString() ?? null,
    provider: (sub.provider ?? null) as BillingProviderSlug | null,
    providerSubscriptionId: sub.providerSubscriptionId,
    startedAt: sub.startedAt.toISOString(),
    createdAt: sub.createdAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
  };
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

// ===== Public API =====

/**
 * Get the subscription for a workspace (or null if none).
 */
export async function getSubscription(workspaceId: string): Promise<SubscriptionDTO | null> {
  const sub = await db.subscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  });
  if (!sub) return null;
  return toSubscriptionDTO(sub);
}

/**
 * Resolve the effective entitlements for a workspace.
 *
 * If the workspace has an active subscription, use its plan's limits.
 * If no subscription exists, fall back to the starter plan's seed limits.
 *
 * This is the function the tool engine calls to determine quota limits.
 */
export async function resolveEntitlements(workspaceId: string): Promise<{
  subscription: SubscriptionDTO | null;
  entitlements: PlanEntitlements;
  planSlug: Plan;
  isActive: boolean;
}> {
  const sub = await db.subscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  });

  if (!sub) {
    // No subscription — fall back to starter plan
    const entitlements = getSeedEntitlements('starter');
    return {
      subscription: null,
      entitlements,
      planSlug: 'starter',
      isActive: false,
    };
  }

  const subDto = toSubscriptionDTO(sub);

  // If subscription is canceled/past_due, the user might still have access
  // until the period ends (grace period). After that, fall back to starter.
  const now = new Date();
  const isGracePeriod = sub.status === 'canceled' || sub.status === 'past_due' || sub.status === 'incomplete';
  const periodEnded = sub.currentPeriodEnd < now;

  if (isGracePeriod && periodEnded) {
    // Grace period over — fall back to starter
    const entitlements = getSeedEntitlements('starter');
    return {
      subscription: subDto,
      entitlements,
      planSlug: 'starter',
      isActive: false,
    };
  }

  const entitlements: PlanEntitlements = {
    plan: sub.plan.slug as Plan,
    maxGenerations: sub.plan.maxGenerations,
    maxTools: sub.plan.maxTools,
    maxStorage: sub.plan.maxStorage,
    teamSeats: sub.plan.teamSeats,
    apiAccess: sub.plan.apiAccess,
    whiteLabel: sub.plan.whiteLabel,
    features: safeParseJson<Record<string, unknown> | null>(sub.plan.features, null),
  };

  return {
    subscription: subDto,
    entitlements,
    planSlug: sub.plan.slug as Plan,
    isActive: sub.status === 'active' || sub.status === 'trialing' || (isGracePeriod && !periodEnded),
  };
}

/**
 * Create a subscription for a workspace (manual or provider-backed).
 * If a subscription already exists, update it instead.
 */
export async function upsertSubscription(
  workspaceId: string,
  planSlug: Plan,
  opts: {
    interval?: SubscriptionInterval;
    status?: SubscriptionStatus;
    provider?: BillingProviderSlug | null;
    providerSubscriptionId?: string | null;
    providerCustomerId?: string | null;
    providerStatus?: string | null;
    providerMetadata?: Record<string, unknown> | null;
    trialDays?: number;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  },
  req?: Request,
  userId?: string,
): Promise<SubscriptionDTO> {
  const plan = await db.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) {
    throw new SubscriptionNotFoundError(workspaceId);
  }

  const interval = opts.interval ?? 'monthly';
  const status = opts.status ?? 'trialing';
  const now = new Date();
  const periodStart = opts.currentPeriodStart ?? now;
  const periodEnd = opts.currentPeriodEnd ?? (interval === 'yearly' ? addMonths(now, 12) : addMonths(now, 1));
  const trialEnd = opts.trialDays ? addMonths(now, 0) : (opts.trialDays ? new Date(now.getTime() + opts.trialDays * 24 * 60 * 60 * 1000) : null);

  const existing = await db.subscription.findUnique({ where: { workspaceId } });

  let sub;
  if (existing) {
    sub = await db.subscription.update({
      where: { workspaceId },
      data: {
        planId: plan.id,
        status,
        interval,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: opts.cancelAtPeriodEnd ?? false,
        trialEnd,
        provider: opts.provider ?? null,
        providerSubscriptionId: opts.providerSubscriptionId ?? null,
        providerCustomerId: opts.providerCustomerId ?? null,
        providerStatus: opts.providerStatus ?? null,
        providerMetadata: opts.providerMetadata ? JSON.stringify(opts.providerMetadata) : null,
      },
      include: { plan: true },
    });
  } else {
    sub = await db.subscription.create({
      data: {
        workspaceId,
        planId: plan.id,
        status,
        interval,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: opts.cancelAtPeriodEnd ?? false,
        trialEnd,
        provider: opts.provider ?? null,
        providerSubscriptionId: opts.providerSubscriptionId ?? null,
        providerCustomerId: opts.providerCustomerId ?? null,
        providerStatus: opts.providerStatus ?? null,
        providerMetadata: opts.providerMetadata ? JSON.stringify(opts.providerMetadata) : null,
      },
      include: { plan: true },
    });
  }

  // Mirror the plan slug onto the workspace owner's User.plan for backward
  // compat with existing RBAC checks (requirePlan, hasFeatureAccess).
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  if (workspace) {
    await db.user.update({
      where: { id: workspace.ownerId },
      data: {
        plan: planSlug,
        planRenewsAt: periodEnd,
        usageLimit: plan.maxGenerations,
      },
    }).catch(() => {}); // never fail the subscription update because of user mirror
  }

  if (req && userId) {
    await auditLog('subscription_upsert', userId, req, 'success', {
      workspaceId,
      planSlug,
      status,
      interval,
      provider: opts.provider ?? null,
    });
  }

  return toSubscriptionDTO(sub);
}

/**
 * Cancel a subscription at period end (or immediately).
 */
export async function cancelSubscription(
  workspaceId: string,
  opts: { immediately?: boolean },
  req?: Request,
  userId?: string,
): Promise<SubscriptionDTO> {
  const sub = await db.subscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  });
  if (!sub) {
    throw new SubscriptionNotFoundError(workspaceId);
  }

  const now = new Date();
  const immediately = opts.immediately ?? false;

  const updated = await db.subscription.update({
    where: { workspaceId },
    data: {
      cancelAtPeriodEnd: true,
      canceledAt: immediately ? now : sub.canceledAt,
      status: immediately ? 'canceled' : sub.status,
      currentPeriodEnd: immediately ? now : sub.currentPeriodEnd,
    },
    include: { plan: true },
  });

  if (req && userId) {
    await auditLog('subscription_cancel', userId, req, 'success', {
      workspaceId,
      immediately,
      planSlug: sub.plan.slug,
    });
  }

  return toSubscriptionDTO(updated);
}

/**
 * Reactivate a canceled subscription (if still within the period).
 */
export async function reactivateSubscription(
  workspaceId: string,
  req?: Request,
  userId?: string,
): Promise<SubscriptionDTO> {
  const sub = await db.subscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  });
  if (!sub) {
    throw new SubscriptionNotFoundError(workspaceId);
  }

  if (sub.status === 'canceled' && sub.currentPeriodEnd < new Date()) {
    throw new BillingError('SUBSCRIPTION_EXPIRED', 'Cannot reactivate a subscription that has already expired.', 400);
  }

  const updated = await db.subscription.update({
    where: { workspaceId },
    data: {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      status: 'active',
    },
    include: { plan: true },
  });

  if (req && userId) {
    await auditLog('subscription_reactivate', userId, req, 'success', { workspaceId });
  }

  return toSubscriptionDTO(updated);
}

/**
 * Change the plan for a workspace subscription (upgrade or downgrade).
 * Returns proration info (credit/charge) for display purposes.
 */
export async function changePlan(
  workspaceId: string,
  targetPlanSlug: Plan,
  opts: {
    interval?: SubscriptionInterval;
    prorate?: boolean;
    provider?: BillingProviderSlug | null;
    providerSubscriptionId?: string | null;
  },
  req?: Request,
  userId?: string,
): Promise<{ subscription: SubscriptionDTO; proratedCredit: number; proratedCharge: number; effectiveImmediately: boolean }> {
  const sub = await db.subscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  });

  const targetPlan = await db.plan.findUnique({ where: { slug: targetPlanSlug } });
  if (!targetPlan) {
    throw new SubscriptionNotFoundError(workspaceId);
  }

  const now = new Date();

  // If no existing subscription, create one (treat as new subscription, not upgrade)
  if (!sub) {
    const newSub = await upsertSubscription(
      workspaceId,
      targetPlanSlug,
      {
        status: 'active',
        interval: opts.interval ?? 'monthly',
        provider: opts.provider ?? null,
        providerSubscriptionId: opts.providerSubscriptionId ?? null,
      },
      req,
      userId,
    );
    return {
      subscription: newSub,
      proratedCredit: 0,
      proratedCharge: targetPlan.priceMonthly / 100,
      effectiveImmediately: true,
    };
  }

  const currentPlan = sub.plan;
  const isUpgrade = targetPlan.sortOrder > currentPlan.sortOrder;
  const isDowngrade = targetPlan.sortOrder < currentPlan.sortOrder;

  // Compute proration (rough estimate — provider does the real calculation)
  const daysInPeriod = Math.max(1, Math.ceil((sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime()) / (24 * 60 * 60 * 1000)));
  const daysElapsed = Math.min(daysInPeriod, Math.max(0, Math.ceil((now.getTime() - sub.currentPeriodStart.getTime()) / (24 * 60 * 60 * 1000))));
  const daysRemaining = daysInPeriod - daysElapsed;
  const currentPrice = sub.interval === 'yearly' ? currentPlan.priceYearly : currentPlan.priceMonthly;
  const targetPrice = sub.interval === 'yearly' ? targetPlan.priceYearly : targetPlan.priceMonthly;
  const unusedCredit = (currentPrice / daysInPeriod) * daysRemaining / 100; // dollars
  const newCharge = (targetPrice / daysInPeriod) * daysRemaining / 100; // dollars
  const proratedCredit = Math.max(0, unusedCredit);
  const proratedCharge = Math.max(0, newCharge - unusedCredit);

  // For downgrades, apply at period end (unless prorate is forced)
  const effectiveImmediately = isUpgrade || opts.prorate === true || sub.provider === null;

  if (effectiveImmediately) {
    const updated = await db.subscription.update({
      where: { workspaceId },
      data: {
        planId: targetPlan.id,
        interval: opts.interval ?? sub.interval,
        status: 'active',
        ...(opts.provider !== undefined ? { provider: opts.provider } : {}),
        ...(opts.providerSubscriptionId !== undefined ? { providerSubscriptionId: opts.providerSubscriptionId } : {}),
      },
      include: { plan: true },
    });

    // Mirror plan onto workspace owner
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    if (workspace) {
      await db.user.update({
        where: { id: workspace.ownerId },
        data: {
          plan: targetPlanSlug,
          usageLimit: targetPlan.maxGenerations,
        },
      }).catch(() => {});
    }

    if (req && userId) {
      await auditLog(
        isUpgrade ? 'subscription_upgrade' : 'subscription_downgrade',
        userId,
        req,
        'success',
        { workspaceId, fromPlan: currentPlan.slug, toPlan: targetPlanSlug, effectiveImmediately: true },
      );
    }

    return {
      subscription: toSubscriptionDTO(updated),
      proratedCredit,
      proratedCharge,
      effectiveImmediately: true,
    };
  }

  // Downgrade deferred to period end — schedule it via metadata
  const metadata = safeParseJson<Record<string, unknown>>(sub.providerMetadata ?? '{}', {});
  metadata.pendingDowngrade = {
    planSlug: targetPlanSlug,
    interval: opts.interval ?? sub.interval,
    scheduledFor: sub.currentPeriodEnd.toISOString(),
  };

  await db.subscription.update({
    where: { workspaceId },
    data: { providerMetadata: JSON.stringify(metadata) },
  });

  if (req && userId) {
    await auditLog('subscription_downgrade_scheduled', userId, req, 'success', {
      workspaceId,
      fromPlan: currentPlan.slug,
      toPlan: targetPlanSlug,
      effectiveAt: sub.currentPeriodEnd.toISOString(),
    });
  }

  // Return current subscription with pending downgrade noted
  const currentSub = await db.subscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  });
  return {
    subscription: toSubscriptionDTO(currentSub!),
    proratedCredit: 0,
    proratedCharge: 0,
    effectiveImmediately: false,
  };
}

/**
 * Get the current period range for a workspace.
 */
export async function getBillingPeriod(workspaceId: string): Promise<{ start: Date; end: Date }> {
  const sub = await db.subscription.findUnique({
    where: { workspaceId },
    select: { currentPeriodStart: true, currentPeriodEnd: true },
  });
  if (sub) {
    return { start: sub.currentPeriodStart, end: sub.currentPeriodEnd };
  }
  // No subscription — use calendar month as default billing period
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}
