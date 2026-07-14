/**
 * File/export entitlements — billing-aware feature checks.
 *
 * Export features require the creator plan or higher.
 * Storage limits are plan-based.
 */
import { resolveEntitlements } from '@/lib/billing/subscription';
import { EntitlementRequiredError } from '@/lib/files/errors';
import type { Plan } from '@/lib/rbac';

/** The minimum plan required for export features. */
export const EXPORT_MIN_PLAN: Plan = 'creator';

/** Storage limits by plan (in MB). */
export const STORAGE_LIMITS_BY_PLAN: Record<string, number> = {
  starter: 10,     // 10 MB
  creator: 500,    // 500 MB
  agency: 10240,   // 10 GB
};

/** Max exports per month by plan. */
export const EXPORT_LIMITS_BY_PLAN: Record<string, number> = {
  starter: 0,
  creator: 50,
  agency: 500,
};

/**
 * Check if a workspace has export access.
 * Throws EntitlementRequiredError if not.
 */
export async function requireExportAccess(workspaceId: string): Promise<{
  planSlug: Plan;
  maxExports: number;
  maxStorageMb: number;
}> {
  const { entitlements, planSlug } = await resolveEntitlements(workspaceId);

  const planRank = (p: Plan): number => ['starter', 'creator', 'agency'].indexOf(p);
  if (planRank(entitlements.plan) < planRank(EXPORT_MIN_PLAN)) {
    throw new EntitlementRequiredError('file_export', entitlements.plan, EXPORT_MIN_PLAN);
  }

  const maxExports = EXPORT_LIMITS_BY_PLAN[entitlements.plan] ?? 0;
  const maxStorageMb = STORAGE_LIMITS_BY_PLAN[entitlements.plan] ?? 10;

  return { planSlug, maxExports, maxStorageMb };
}

/**
 * Check if a workspace can upload files (storage limit check).
 */
export async function canUploadFile(workspaceId: string, fileSizeBytes: number): Promise<{
  allowed: boolean;
  reason?: string;
  usedMb: number;
  limitMb: number;
}> {
  const { maxStorageMb } = await requireExportAccess(workspaceId);

  // Calculate current storage usage
  const { db } = await import('@/lib/db');
  const usage = await db.fileAsset.aggregate({
    where: { workspaceId, deletedAt: null },
    _sum: { sizeBytes: true },
  });
  const usedBytes = usage._sum.sizeBytes ?? 0;
  const usedMb = usedBytes / (1024 * 1024);

  if (usedMb + fileSizeBytes / (1024 * 1024) > maxStorageMb) {
    return {
      allowed: false,
      reason: `Storage limit exceeded. Used: ${usedMb.toFixed(1)} MB, Limit: ${maxStorageMb} MB. Upgrade your plan for more storage.`,
      usedMb,
      limitMb: maxStorageMb,
    };
  }

  return { allowed: true, usedMb, limitMb: maxStorageMb };
}

/**
 * Check if a workspace can create an export (monthly limit check).
 */
export async function canCreateExport(workspaceId: string): Promise<{
  allowed: boolean;
  reason?: string;
  usedExports: number;
  maxExports: number;
}> {
  const { maxExports } = await requireExportAccess(workspaceId);

  // Count exports this month
  const { db } = await import('@/lib/db');
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const usedExports = await db.exportJob.count({
    where: { workspaceId, createdAt: { gte: monthStart } },
  });

  if (usedExports >= maxExports) {
    return {
      allowed: false,
      reason: `Export limit reached (${usedExports}/${maxExports} this month). Upgrade your plan for more exports.`,
      usedExports,
      maxExports,
    };
  }

  return { allowed: true, usedExports, maxExports };
}
