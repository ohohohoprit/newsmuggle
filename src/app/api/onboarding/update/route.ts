import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { updateOnboardingStep, type OnboardingInput } from '@/lib/onboarding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/update
 * Updates onboarding step data and returns the new status.
 * Body: { name?, username?, bio?, country?, timezone?, language?, creatorCategory?, socialLinks?, avatar? }
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);

  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate input — all fields optional
  const input: OnboardingInput = {};

  if (typeof body.name === 'string') input.name = body.name.trim().slice(0, 100) || undefined;
  if (typeof body.username === 'string') input.username = body.username.trim().slice(0, 50) || undefined;
  if (typeof body.bio === 'string') input.bio = body.bio.trim().slice(0, 500) || undefined;
  if (typeof body.country === 'string') input.country = body.country.trim().slice(0, 100) || undefined;
  if (typeof body.timezone === 'string') input.timezone = body.timezone.trim() || undefined;
  if (typeof body.language === 'string') input.language = body.language.trim() || undefined;
  if (typeof body.creatorCategory === 'string') input.creatorCategory = body.creatorCategory.trim() || undefined;
  if (typeof body.avatar === 'string') input.avatar = body.avatar || undefined;
  if (body.socialLinks && typeof body.socialLinks === 'object') {
    const links: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.socialLinks as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) links[k] = v.trim().slice(0, 200);
    }
    if (Object.keys(links).length > 0) input.socialLinks = links;
  }

  const status = await updateOnboardingStep(auth.user!.id, input, req);

  return NextResponse.json({
    success: true,
    completed: status.completed,
    steps: status.steps,
    completionPercentage: status.completionPercentage,
    redirectTo: status.redirectTo,
  });
}
