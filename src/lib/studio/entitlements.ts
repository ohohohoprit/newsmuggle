/**
 * Studio entitlements — billing-aware feature checks for the studio.
 *
 * The studio requires the creator plan or higher for connecting accounts
 * and viewing analytics. This module checks the workspace's effective
 * plan via the billing service and throws a structured error if the
 * user's plan doesn't include studio features.
 */
import { resolveEntitlements } from '@/lib/billing/subscription';
import { EntitlementRequiredError } from '@/lib/studio/errors';
import type { Plan } from '@/lib/rbac';

/** The minimum plan required for studio features. */
export const STUDIO_MIN_PLAN: Plan = 'creator';

/** The minimum plan required for multi-account connections. */
export const STUDIO_MULTI_ACCOUNT_PLAN: Plan = 'agency';

/** Maximum connected accounts per workspace by plan. */
export const MAX_ACCOUNTS_BY_PLAN: Record<string, number> = {
  starter: 0,
  creator: 3,
  agency: 20,
};

/**
 * Check if a workspace has studio access.
 * Throws EntitlementRequiredError if not.
 */
export async function requireStudioAccess(workspaceId: string): Promise<{
  planSlug: Plan;
  maxAccounts: number;
  canConnectMultiple: boolean;
}> {
  const { entitlements, planSlug } = await resolveEntitlements(workspaceId);

  const planRank = (p: Plan): number => ['starter', 'creator', 'agency'].indexOf(p);
  if (planRank(entitlements.plan) < planRank(STUDIO_MIN_PLAN)) {
    throw new EntitlementRequiredError('creator_studio', entitlements.plan, STUDIO_MIN_PLAN);
  }

  const maxAccounts = MAX_ACCOUNTS_BY_PLAN[entitlements.plan] ?? 0;
  const canConnectMultiple = planRank(entitlements.plan) >= planRank(STUDIO_MULTI_ACCOUNT_PLAN);

  return {
    planSlug,
    maxAccounts,
    canConnectMultiple,
  };
}

/**
 * Check if a workspace can connect another account (respects plan limits).
 */
export async function canConnectAccount(workspaceId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  reason?: string;
}> {
  const { maxAccounts } = await requireStudioAccess(workspaceId);

  // Count existing connected accounts
  const { db } = await import('@/lib/db');
  const count = await db.connectedAccount.count({
    where: { workspaceId, isConnected: true },
  });

  if (count >= maxAccounts) {
    return {
      allowed: false,
      current: count,
      max: maxAccounts,
      reason: `You have reached the maximum number of connected accounts (${maxAccounts}) for your plan. Upgrade to connect more.`,
    };
  }

  return {
    allowed: true,
    current: count,
    max: maxAccounts,
  };
}

/**
 * Check if a workspace can access a specific studio feature.
 * Currently all studio features require the creator plan.
 */
export async function hasStudioFeature(
  workspaceId: string,
  _feature: 'analytics' | 'content_history' | 'audience_insights' | 'realtime_sync',
): Promise<boolean> {
  try {
    await requireStudioAccess(workspaceId);
    return true;
  } catch {
    return false;
  }
}
