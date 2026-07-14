import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { seedPlans } from '@/lib/billing/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/billing/seed
 * Seed (or re-sync) the plan catalog into the DB. Idempotent.
 * Also picks up STRIPE_PRICE_* and RAZORPAY_PLAN_* env vars.
 *
 * Admin only.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  const result = await seedPlans(req, auth.user!.id);
  return NextResponse.json({ success: true, ...result });
}
