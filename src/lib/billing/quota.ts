/**
 * Quota enforcement + usage sync — connects billing entitlements with
 * the existing tool usage quota system.
 *
 * The tool engine calls `checkAndIncrementQuota()` before each AI
 * generation. This function:
 *   1. Resolves the workspace's effective entitlements (plan limits).
 *   2. Checks the existing ToolUsageQuota for the current period.
 *   3. If allowed, increments the usage counter.
 *   4. If exceeded, throws a structured QuotaExceededError.
 *
 * Usage sync (snapshot) is handled separately by `createUsageSnapshot()`
 * which is called monthly by a cron job or the quota_reset webhook.
 */
import { db } from '@/lib/db';
import type { Plan } from '@/lib/rbac';
import type { UsageSummary, QuotaCheckResult } from '@/lib/billing/types';
import { resolveEntitlements, getBillingPeriod } from '@/lib/billing/subscription';
import { QuotaExceededError } from '@/lib/billing/errors';

// ===== Helpers =====

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ===== Public API =====

/**
 * Check + increment the workspace's monthly AI generation quota.
 *
 * This is the single function the tool engine calls. It:
 *   - Resolves the effective plan (via subscription or seed fallback)
 *   - Finds/creates the ToolUsageQuota row for the current period
 *   - Throws QuotaExceededError if the limit is reached
 *   - Increments the counter if allowed
 *
 * Returns the quota state after incrementing.
 */
export async function checkAndIncrementQuota(
  workspaceId: string,
): Promise<QuotaCheckResult> {
  const { entitlements, planSlug, isActive } = await resolveEntitlements(workspaceId);
  const { start, end } = await getBillingPeriod(workspaceId);

  const limit = entitlements.maxGenerations;

  // Find the workspace-wide quota row (toolId = null)
  const existing = await db.toolUsageQuota.findFirst({
    where: {
      workspaceId,
      toolId: null,
      periodStart: start,
    },
  });

  const used = (existing?.used ?? 0) + 1;

  if (used > limit) {
    throw new QuotaExceededError(existing?.used ?? 0, limit, planSlug);
  }

  // Increment
  if (existing) {
    await db.toolUsageQuota.update({
      where: { id: existing.id },
      data: { used: { increment: 1 }, limit },
    });
  } else {
    await db.toolUsageQuota.create({
      data: {
        workspaceId,
        toolId: null,
        periodStart: start,
        periodEnd: end,
        used: 1,
        limit,
      },
    });
  }

  return {
    allowed: true,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    planSlug,
    workspaceId,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}

/**
 * Peek at the current quota WITHOUT incrementing (for status display).
 */
export async function getQuotaStatus(workspaceId: string): Promise<QuotaCheckResult> {
  const { entitlements, planSlug } = await resolveEntitlements(workspaceId);
  const { start, end } = await getBillingPeriod(workspaceId);
  const limit = entitlements.maxGenerations;

  const existing = await db.toolUsageQuota.findFirst({
    where: {
      workspaceId,
      toolId: null,
      periodStart: start,
    },
  });

  const used = existing?.used ?? 0;

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    planSlug,
    workspaceId,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}

/**
 * Get the full usage summary for a workspace (for the billing/usage endpoint).
 * Includes tokens used, cost, storage, and team seats.
 */
export async function getUsageSummary(workspaceId: string): Promise<UsageSummary> {
  const { entitlements, planSlug } = await resolveEntitlements(workspaceId);
  const { start, end } = await getBillingPeriod(workspaceId);

  const [quotaRow, tokenStats, teamSeats, storageStats] = await Promise.all([
    db.toolUsageQuota.findFirst({
      where: { workspaceId, toolId: null, periodStart: start },
    }),
    db.toolExecution.aggregate({
      where: {
        workspaceId,
        createdAt: { gte: start, lte: end },
      },
      _sum: { totalTokens: true, costUsd: true },
      _count: true,
    }),
    db.workspaceMember.count({
      where: { workspaceId, status: 'active' },
    }),
    db.generatedItem.count({
      where: { userId: workspaceId }, // rough proxy; real storage tracking would be separate
    }),
  ]);

  const used = quotaRow?.used ?? 0;
  const limit = entitlements.maxGenerations;
  const tokensUsed = tokenStats._sum.totalTokens ?? 0;
  const costUsd = tokenStats._sum.costUsd ?? 0;

  return {
    workspaceId,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    planSlug,
    generationsUsed: used,
    generationsLimit: limit,
    generationsRemaining: Math.max(0, limit - used),
    tokensUsed,
    costUsd,
    storageUsedMb: 0, // placeholder — real storage tracking would scan file sizes
    teamSeatsUsed: teamSeats,
    percentUsed: limit > 0 ? Math.round((used / limit) * 100) : 0,
  };
}

/**
 * Reset the quota for a workspace (called by the quota_reset webhook or
 * monthly cron). Creates a new period's quota row and snapshots the
 * previous period's usage.
 */
export async function resetQuota(
  workspaceId: string,
  newPeriodStart: Date,
  newPeriodEnd: Date,
): Promise<void> {
  const { entitlements, planSlug } = await resolveEntitlements(workspaceId);

  // Snapshot the previous period's usage
  await createUsageSnapshot(workspaceId, newPeriodStart, newPeriodEnd, planSlug).catch(() => {});

  // Create the new period's quota row (used=0)
  const existing = await db.toolUsageQuota.findFirst({
    where: { workspaceId, toolId: null, periodStart: newPeriodStart },
  });

  if (existing) {
    await db.toolUsageQuota.update({
      where: { id: existing.id },
      data: { used: 0, limit: entitlements.maxGenerations, periodEnd: newPeriodEnd },
    });
  } else {
    await db.toolUsageQuota.create({
      data: {
        workspaceId,
        toolId: null,
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
        used: 0,
        limit: entitlements.maxGenerations,
      },
    });
  }
}

/**
 * Create a usage snapshot for a workspace (archival record of a billing period).
 */
export async function createUsageSnapshot(
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date,
  planSlug: Plan,
): Promise<void> {
  const [quotaRow, tokenStats, teamSeats] = await Promise.all([
    db.toolUsageQuota.findFirst({
      where: { workspaceId, toolId: null, periodStart },
    }),
    db.toolExecution.aggregate({
      where: {
        workspaceId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { totalTokens: true, costUsd: true },
    }),
    db.workspaceMember.count({
      where: { workspaceId, status: 'active' },
    }),
  ]);

  const snapshotData = {
    planSlug,
    generationsUsed: quotaRow?.used ?? 0,
    generationsLimit: quotaRow?.limit ?? 0,
    tokensUsed: tokenStats._sum.totalTokens ?? 0,
    costUsd: tokenStats._sum.costUsd ?? 0,
    teamSeatsUsed: teamSeats,
  };

  // Upsert the snapshot (unique on [workspaceId, periodStart])
  const existing = await db.usageSnapshot.findUnique({
    where: {
      workspaceId_periodStart: { workspaceId, periodStart },
    },
  });

  if (existing) {
    await db.usageSnapshot.update({
      where: { id: existing.id },
      data: {
        planSlug,
        generationsUsed: snapshotData.generationsUsed,
        generationsLimit: snapshotData.generationsLimit,
        tokensUsed: snapshotData.tokensUsed,
        costUsd: snapshotData.costUsd,
        teamSeatsUsed: snapshotData.teamSeatsUsed,
        snapshotData: JSON.stringify(snapshotData),
      },
    });
  } else {
    await db.usageSnapshot.create({
      data: {
        workspaceId,
        periodStart,
        periodEnd,
        planSlug,
        generationsUsed: snapshotData.generationsUsed,
        generationsLimit: snapshotData.generationsLimit,
        tokensUsed: snapshotData.tokensUsed,
        costUsd: snapshotData.costUsd,
        teamSeatsUsed: snapshotData.teamSeatsUsed,
        snapshotData: JSON.stringify(snapshotData),
      },
    });
  }
}

/**
 * Check if a workspace has reached a usage threshold (for notifications).
 * Returns the thresholds that have been crossed (80%, 90%, 100%).
 */
export async function checkUsageThresholds(workspaceId: string): Promise<number[]> {
  const summary = await getUsageSummary(workspaceId);
  const thresholds: number[] = [];
  if (summary.percentUsed >= 100) thresholds.push(100);
  if (summary.percentUsed >= 90) thresholds.push(90);
  if (summary.percentUsed >= 80) thresholds.push(80);
  return thresholds;
}
