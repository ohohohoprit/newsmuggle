import { NextResponse } from 'next/server';
import { listPublicPlans } from '@/lib/billing/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/plans
 * List all public plans with pricing + features. Public (no auth required)
 * since plans are marketing material, not user data.
 */
export async function GET() {
  const plans = await listPublicPlans();
  return NextResponse.json({ plans, count: plans.length });
}
