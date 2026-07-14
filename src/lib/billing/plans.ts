/**
 * Plan catalog — the source of truth for plan definitions.
 *
 * This module provides the seed data for the Plan DB table and a
 * fallback in-memory catalog used when the DB is not yet seeded.
 *
 * The DB is the authoritative source at runtime (admin-editable, supports
 * provider price IDs). This module seeds it on first run.
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/auth';
import type { Plan } from '@/lib/rbac';
import type { PlanDTO, PlanEntitlements } from '@/lib/billing/types';
import { PlanNotFoundError, PlanInactiveError } from '@/lib/billing/errors';

// ===== Seed plan definitions =====
// Prices in cents (USD) to avoid floating-point issues.

export interface PlanSeed {
  slug: Plan;
  name: string;
  description: string;
  priceMonthly: number; // cents
  priceYearly: number; // cents
  currency: string;
  maxGenerations: number;
  maxTools: number;
  maxStorage: number; // GB
  teamSeats: number;
  apiAccess: boolean;
  whiteLabel: boolean;
  features: Record<string, unknown>;
  sortOrder: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  razorpayPlanIdMonthly: string | null;
  razorpayPlanIdYearly: string | null;
}

export const PLAN_SEEDS: PlanSeed[] = [
  {
    slug: 'starter',
    name: 'Starter',
    description: 'For solo creators getting started with AI tools.',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'usd',
    maxGenerations: 10,
    maxTools: 5,
    maxStorage: 1,
    teamSeats: 0,
    apiAccess: false,
    whiteLabel: false,
    features: { aiTools: true, history: true, folders: false, prioritySupport: false },
    sortOrder: 1,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    razorpayPlanIdMonthly: null,
    razorpayPlanIdYearly: null,
  },
  {
    slug: 'creator',
    name: 'Creator',
    description: 'For active creators who need more power and higher limits.',
    priceMonthly: 1900, // $19
    priceYearly: 19000, // $190 (2 months free)
    currency: 'usd',
    maxGenerations: 100,
    maxTools: 999999, // effectively unlimited
    maxStorage: 10,
    teamSeats: 0,
    apiAccess: false,
    whiteLabel: false,
    features: { aiTools: true, history: true, folders: true, prioritySupport: false, customPresets: true },
    sortOrder: 2,
    stripePriceIdMonthly: null, // set via env: STRIPE_PRICE_CREATOR_MONTHLY
    stripePriceIdYearly: null,
    razorpayPlanIdMonthly: null,
    razorpayPlanIdYearly: null,
  },
  {
    slug: 'agency',
    name: 'Agency',
    description: 'For teams and agencies managing multiple creators.',
    priceMonthly: 4900, // $49
    priceYearly: 49000, // $490
    currency: 'usd',
    maxGenerations: 1000,
    maxTools: 999999,
    maxStorage: 50,
    teamSeats: 5,
    apiAccess: true,
    whiteLabel: true,
    features: { aiTools: true, history: true, folders: true, prioritySupport: true, customPresets: true, teamWorkspaces: true, apiKeys: true },
    sortOrder: 3,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    razorpayPlanIdMonthly: null,
    razorpayPlanIdYearly: null,
  },
];

// ===== Env-driven provider price ID resolution =====

const STRIPE_PRICE_ENV: Record<Plan, { monthly?: string; yearly?: string }> = {
  starter: { monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY, yearly: process.env.STRIPE_PRICE_STARTER_YEARLY },
  creator: { monthly: process.env.STRIPE_PRICE_CREATOR_MONTHLY, yearly: process.env.STRIPE_PRICE_CREATOR_YEARLY },
  agency: { monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY, yearly: process.env.STRIPE_PRICE_AGENCY_YEARLY },
};

const RAZORPAY_PLAN_ENV: Record<Plan, { monthly?: string; yearly?: string }> = {
  starter: { monthly: process.env.RAZORPAY_PLAN_STARTER_MONTHLY, yearly: process.env.RAZORPAY_PLAN_STARTER_YEARLY },
  creator: { monthly: process.env.RAZORPAY_PLAN_CREATOR_MONTHLY, yearly: process.env.RAZORPAY_PLAN_CREATOR_YEARLY },
  agency: { monthly: process.env.RAZORPAY_PLAN_AGENCY_MONTHLY, yearly: process.env.RAZORPAY_PLAN_AGENCY_YEARLY },
};

// ===== DTO mapper =====

function toDTO(plan: {
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
}): PlanDTO {
  let features: Record<string, unknown> | null = null;
  if (plan.features) {
    try {
      features = JSON.parse(plan.features);
    } catch {
      features = null;
    }
  }
  return {
    id: plan.id,
    slug: plan.slug as Plan,
    name: plan.name,
    description: plan.description,
    priceMonthly: plan.priceMonthly / 100, // cents → dollars
    priceYearly: plan.priceYearly / 100,
    currency: plan.currency,
    maxGenerations: plan.maxGenerations,
    maxTools: plan.maxTools,
    maxStorage: plan.maxStorage,
    teamSeats: plan.teamSeats,
    apiAccess: plan.apiAccess,
    whiteLabel: plan.whiteLabel,
    features,
    isPublic: plan.isPublic,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    stripePriceIdMonthly: plan.stripePriceIdMonthly,
    stripePriceIdYearly: plan.stripePriceIdYearly,
    razorpayPlanIdMonthly: plan.razorpayPlanIdMonthly,
    razorpayPlanIdYearly: plan.razorpayPlanIdYearly,
  };
}

// ===== Public API =====

/** List all public plans (sorted by sortOrder). Cached for 5 minutes. */
export async function listPublicPlans(): Promise<PlanDTO[]> {
  const { getOrSet, CacheKeys } = await import('@/lib/cache/service');
  return getOrSet(CacheKeys.plansList(), 300, async () => {
    const plans = await db.plan.findMany({
      where: { isPublic: true, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    if (plans.length === 0) {
      // Fallback to seed data if DB not yet seeded
      return PLAN_SEEDS.map((s) => seedToDTO(s));
    }
    return plans.map(toDTO);
  });
}

/** List ALL plans (including private/inactive) — admin only. */
export async function listAllPlans(): Promise<PlanDTO[]> {
  const plans = await db.plan.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  if (plans.length === 0) {
    return PLAN_SEEDS.map((s) => seedToDTO(s));
  }
  return plans.map(toDTO);
}

/** Get a plan by slug. */
export async function getPlanBySlug(slug: Plan): Promise<PlanDTO> {
  const plan = await db.plan.findUnique({ where: { slug } });
  if (!plan) {
    // Fallback to seed
    const seed = PLAN_SEEDS.find((s) => s.slug === slug);
    if (seed) return seedToDTO(seed);
    throw new PlanNotFoundError(slug);
  }
  if (!plan.isActive) {
    throw new PlanInactiveError(slug);
  }
  return toDTO(plan);
}

/** Get entitlements for a plan (used by quota enforcement). */
export async function getEntitlements(slug: Plan): Promise<PlanEntitlements> {
  const plan = await getPlanBySlug(slug);
  return {
    plan: plan.slug,
    maxGenerations: plan.maxGenerations,
    maxTools: plan.maxTools,
    maxStorage: plan.maxStorage,
    teamSeats: plan.teamSeats,
    apiAccess: plan.apiAccess,
    whiteLabel: plan.whiteLabel,
    features: plan.features,
  };
}

/** Get the fallback entitlements from the in-memory seed (no DB hit). */
export function getSeedEntitlements(slug: Plan): PlanEntitlements {
  const seed = PLAN_SEEDS.find((s) => s.slug === slug) ?? PLAN_SEEDS[0];
  return {
    plan: seed.slug,
    maxGenerations: seed.maxGenerations,
    maxTools: seed.maxTools,
    maxStorage: seed.maxStorage,
    teamSeats: seed.teamSeats,
    apiAccess: seed.apiAccess,
    whiteLabel: seed.whiteLabel,
    features: seed.features,
  };
}

// ===== Seed =====

function seedToDTO(seed: PlanSeed): PlanDTO {
  return {
    id: `seed-${seed.slug}`,
    slug: seed.slug,
    name: seed.name,
    description: seed.description,
    priceMonthly: seed.priceMonthly / 100,
    priceYearly: seed.priceYearly / 100,
    currency: seed.currency,
    maxGenerations: seed.maxGenerations,
    maxTools: seed.maxTools,
    maxStorage: seed.maxStorage,
    teamSeats: seed.teamSeats,
    apiAccess: seed.apiAccess,
    whiteLabel: seed.whiteLabel,
    features: seed.features,
    isPublic: true,
    isActive: true,
    sortOrder: seed.sortOrder,
    stripePriceIdMonthly: STRIPE_PRICE_ENV[seed.slug].monthly ?? null,
    stripePriceIdYearly: STRIPE_PRICE_ENV[seed.slug].yearly ?? null,
    razorpayPlanIdMonthly: RAZORPAY_PLAN_ENV[seed.slug].monthly ?? null,
    razorpayPlanIdYearly: RAZORPAY_PLAN_ENV[seed.slug].yearly ?? null,
  };
}

/** Seed (or re-sync) plans into the DB. Idempotent. */
export async function seedPlans(req?: Request, userId?: string): Promise<{ created: number; updated: number; total: number }> {
  let created = 0;
  let updated = 0;

  for (const seed of PLAN_SEEDS) {
    const existing = await db.plan.findUnique({ where: { slug: seed.slug } });
    const stripeMonthly = STRIPE_PRICE_ENV[seed.slug].monthly ?? null;
    const stripeYearly = STRIPE_PRICE_ENV[seed.slug].yearly ?? null;
    const razorpayMonthly = RAZORPAY_PLAN_ENV[seed.slug].monthly ?? null;
    const razorpayYearly = RAZORPAY_PLAN_ENV[seed.slug].yearly ?? null;

    if (existing) {
      await db.plan.update({
        where: { slug: seed.slug },
        data: {
          name: seed.name,
          description: seed.description,
          priceMonthly: seed.priceMonthly,
          priceYearly: seed.priceYearly,
          currency: seed.currency,
          maxGenerations: seed.maxGenerations,
          maxTools: seed.maxTools,
          maxStorage: seed.maxStorage,
          teamSeats: seed.teamSeats,
          apiAccess: seed.apiAccess,
          whiteLabel: seed.whiteLabel,
          features: JSON.stringify(seed.features),
          sortOrder: seed.sortOrder,
          // Only update provider price IDs if env vars are set (don't overwrite manual DB edits with nulls)
          ...(stripeMonthly ? { stripePriceIdMonthly: stripeMonthly } : {}),
          ...(stripeYearly ? { stripePriceIdYearly: stripeYearly } : {}),
          ...(razorpayMonthly ? { razorpayPlanIdMonthly: razorpayMonthly } : {}),
          ...(razorpayYearly ? { razorpayPlanIdYearly: razorpayYearly } : {}),
        },
      });
      updated++;
    } else {
      await db.plan.create({
        data: {
          slug: seed.slug,
          name: seed.name,
          description: seed.description,
          priceMonthly: seed.priceMonthly,
          priceYearly: seed.priceYearly,
          currency: seed.currency,
          maxGenerations: seed.maxGenerations,
          maxTools: seed.maxTools,
          maxStorage: seed.maxStorage,
          teamSeats: seed.teamSeats,
          apiAccess: seed.apiAccess,
          whiteLabel: seed.whiteLabel,
          features: JSON.stringify(seed.features),
          isPublic: true,
          isActive: true,
          sortOrder: seed.sortOrder,
          stripePriceIdMonthly: stripeMonthly,
          stripePriceIdYearly: stripeYearly,
          razorpayPlanIdMonthly: razorpayMonthly,
          razorpayPlanIdYearly: razorpayYearly,
        },
      });
      created++;
    }
  }

  if (req && userId) {
    await auditLog('billing_plans_seed', userId, req, 'success', { created, updated, total: PLAN_SEEDS.length });
  }

  // Invalidate plan caches
  try {
    const { clearNamespace } = await import('@/lib/cache/service');
    clearNamespace('plans');
  } catch {
    // best-effort
  }

  return { created, updated, total: PLAN_SEEDS.length };
}
