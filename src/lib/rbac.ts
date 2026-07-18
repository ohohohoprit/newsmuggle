/**
 * Role-Based Access Control (RBAC) helpers.
 * Provides guard functions for API routes and middleware.
 */
import { getSession, getTokenFromRequest, type AuthUser, type SessionData } from '@/lib/auth';

// ===== Role Definitions =====

export type Role = 'user' | 'admin' | 'moderator';

export const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

// ===== Plan Definitions =====

export type Plan = 'starter' | 'creator' | 'agency';

export const PLAN_FEATURES: Record<Plan, {
  maxTools: number;
  maxGenerations: number;
  maxStorage: number; // GB
  teamSeats: number;
  apiAccess: boolean;
  whiteLabel: boolean;
}> = {
  starter: { maxTools: 5, maxGenerations: 10, maxStorage: 1, teamSeats: 0, apiAccess: false, whiteLabel: false },
  creator: { maxTools: Infinity, maxGenerations: 100, maxStorage: 10, teamSeats: 0, apiAccess: false, whiteLabel: false },
  agency: { maxTools: Infinity, maxGenerations: 1000, maxStorage: 50, teamSeats: 5, apiAccess: true, whiteLabel: true },
};

// ===== Auth Guard Functions =====

export interface AuthResult {
  authenticated: boolean;
  session: SessionData | null;
  user: AuthUser | null;
  error?: string;
}

/**
 * Require authentication — returns session or throws.
 * Use in API route handlers to protect endpoints.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const token = getTokenFromRequest(req);
  const session = await getSession(token);

  if (!session) {
    return {
      authenticated: false,
      session: null,
      user: null,
      error: 'UNAUTHENTICATED',
    };
  }

  return {
    authenticated: true,
    session,
    user: session.user,
  };
}

/**
 * Require a specific role — returns session if user has the role, else error.
 */
export async function requireRole(req: Request, role: Role): Promise<AuthResult> {
  const result = await requireAuth(req);

  if (!result.authenticated) return result;

  const userRole = (result.user!.role as Role) || 'user';
  if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[role]) {
    return {
      authenticated: true,
      session: result.session,
      user: result.user,
      error: 'FORBIDDEN',
    };
  }

  return result;
}

/**
 * Require admin role.
 */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  return requireRole(req, 'admin');
}

/**
 * Require a specific plan or higher.
 */
export async function requirePlan(req: Request, plan: Plan): Promise<AuthResult> {
  const result = await requireAuth(req);

  if (!result.authenticated) return result;

  const userPlan = (result.user!.plan as Plan) || 'starter';
  const planOrder: Plan[] = ['starter', 'creator', 'agency'];
  const userPlanIndex = planOrder.indexOf(userPlan);
  const requiredPlanIndex = planOrder.indexOf(plan);

  if (userPlanIndex < requiredPlanIndex) {
    return {
      authenticated: true,
      session: result.session,
      user: result.user,
      error: 'PLAN_UPGRADE_REQUIRED',
    };
  }

  return result;
}

/**
 * Check if a user has access to a specific feature.
 */
export function hasFeatureAccess(user: AuthUser, feature: 'maxTools' | 'maxGenerations' | 'maxStorage' | 'teamSeats' | 'apiAccess' | 'whiteLabel'): boolean {
  const plan = (user.plan as Plan) || 'starter';
  const features = PLAN_FEATURES[plan];
  const value = features[feature];
  return typeof value === 'boolean' ? value : value > 0;
}

/**
 * Get the user's current plan limits.
 */
export function getPlanLimits(user: AuthUser) {
  const plan = (user.plan as Plan) || 'starter';
  return PLAN_FEATURES[plan];
}

/**
 * Check if user has reached their generation limit.
 * Returns true if limit is reached.
 */
export async function checkGenerationLimit(userId: string): Promise<{ reached: boolean; current: number; limit: number }> {
  const user = await fetchUserForLimits(userId);
  const plan = (user.plan as Plan) || 'starter';
  const limit = PLAN_FEATURES[plan].maxGenerations;

  return {
    reached: user.usageCount >= limit,
    current: user.usageCount,
    limit,
  };
}

/**
 * Increment the user's generation usage count.
 */
export async function incrementUsage(userId: string): Promise<void> {
  const { db } = await import('@/lib/db');
  await db.user.update({
    where: { id: userId },
    data: { usageCount: { increment: 1 } },
  });
}

/**
 * Reset usage count (called monthly by cron job or billing webhook).
 */
export async function resetUsage(userId: string): Promise<void> {
  const { db } = await import('@/lib/db');
  await db.user.update({
    where: { id: userId },
    data: { usageCount: 0 },
  });
}

// ===== Internal Helper =====

async function fetchUserForLimits(userId: string) {
  const { db } = await import('@/lib/db');
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, usageCount: true, usageLimit: true },
  });
  return user || { plan: 'starter', usageCount: 0, usageLimit: 10 };
}
