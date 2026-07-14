import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getOnboardingStatus } from '@/lib/onboarding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/onboarding/status
 * Returns the user's onboarding status, step completion, and redirect URL.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);

  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const status = await getOnboardingStatus(auth.user!.id);

  return NextResponse.json({
    completed: status.completed,
    steps: status.steps,
    completionPercentage: status.completionPercentage,
    redirectTo: status.redirectTo,
  });
}
