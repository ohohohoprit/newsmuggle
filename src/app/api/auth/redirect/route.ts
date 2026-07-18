import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getPostLoginRedirect } from '@/lib/onboarding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/redirect
 * Returns the URL the frontend should navigate to after login.
 * - First login (onboarding incomplete): /onboarding
 * - Returning user (onboarding complete): /studio
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);

  if (!auth.authenticated) {
    return NextResponse.json({
      authenticated: false,
      redirectTo: '/api/auth/login',
    });
  }

  const redirectTo = await getPostLoginRedirect(auth.user!.id);

  return NextResponse.json({
    authenticated: true,
    redirectTo,
    onboardingCompleted: auth.user!.onboardingCompleted,
    user: auth.user,
  });
}
