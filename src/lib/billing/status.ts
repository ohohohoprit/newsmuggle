/**
 * Billing status service — aggregates subscription + plan + usage + entitlements
 * into a single response for the /api/billing/status endpoint.
 */
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/workspace';
import type { BillingStatusDTO } from '@/lib/billing/types';
import { resolveEntitlements, getSubscription } from '@/lib/billing/subscription';
import { getQuotaStatus, getUsageSummary } from '@/lib/billing/quota';
import { getPlanBySlug } from '@/lib/billing/plans';

/**
 * Get the full billing status for a workspace.
 * Verifies the caller is a member of the workspace.
 */
export async function getBillingStatus(
  workspaceId: string,
  userId: string,
): Promise<BillingStatusDTO> {
  // Verify workspace access
  await requireMembership(workspaceId, userId);

  const { subscription, entitlements, planSlug, isActive } = await resolveEntitlements(workspaceId);
  const plan = await getPlanBySlug(planSlug).catch(() => null);
  const usage = await getUsageSummary(workspaceId);

  const now = new Date();
  const daysUntilRenewal = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : null;

  return {
    workspaceId,
    subscription,
    plan,
    usage: {
      generationsUsed: usage.generationsUsed,
      generationsLimit: usage.generationsLimit,
      generationsRemaining: usage.generationsRemaining,
      tokensUsed: usage.tokensUsed,
      costUsd: usage.costUsd,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
    },
    entitlements,
    isTrialing: subscription?.status === 'trialing',
    isActive,
    isPastDue: subscription?.status === 'past_due',
    isCanceled: subscription?.status === 'canceled',
    daysUntilRenewal,
  };
}
