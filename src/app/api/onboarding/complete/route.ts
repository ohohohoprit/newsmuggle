import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { completeOnboarding, getOnboardingStatus } from '@/lib/onboarding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/complete
 * Force-completes onboarding for the current user (skip remaining steps).
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);

  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  await completeOnboarding(auth.user!.id, req);

  const status = await getOnboardingStatus(auth.user!.id);

  return NextResponse.json({
    success: true,
    completed: true,
    redirectTo: status.redirectTo,
  });
}
