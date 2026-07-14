import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getOnboardingStatus } from '@/lib/onboarding';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/completion
 * Returns the user's profile completion percentage and missing fields.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);

  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const userId = auth.user!.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      username: true,
      email: true,
      phone: true,
      bio: true,
      country: true,
      timezone: true,
      language: true,
      creatorCategory: true,
      avatar: true,
      onboardingCompleted: true,
      socialAccounts: { select: { platform: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  // Define all profile fields with their current state
  const fields = [
    { key: 'name', label: 'Full Name', filled: !!user.name, required: true },
    { key: 'username', label: 'Username', filled: !!user.username, required: true },
    { key: 'email', label: 'Email', filled: !!user.email, required: true },
    { key: 'phone', label: 'Phone', filled: !!user.phone, required: false },
    { key: 'bio', label: 'Bio', filled: !!user.bio, required: false },
    { key: 'country', label: 'Country', filled: !!user.country, required: false },
    { key: 'timezone', label: 'Timezone', filled: !!user.timezone, required: false },
    { key: 'language', label: 'Language', filled: !!user.language, required: false },
    { key: 'creatorCategory', label: 'Creator Category', filled: !!user.creatorCategory, required: false },
    { key: 'avatar', label: 'Profile Picture', filled: !!user.avatar, required: false },
    { key: 'socialLinks', label: 'Social Links', filled: user.socialAccounts.length > 0, required: false },
  ];

  const totalFields = fields.length;
  const filledFields = fields.filter(f => f.filled).length;
  const completionPercentage = Math.round((filledFields / totalFields) * 100);

  const missingRequired = fields.filter(f => !f.filled && f.required).map(f => f.key);
  const missingOptional = fields.filter(f => !f.filled && !f.required).map(f => f.key);

  // Get onboarding status for redirect logic
  const onboardingStatus = await getOnboardingStatus(userId);

  return NextResponse.json({
    completionPercentage,
    totalFields,
    filledFields,
    fields,
    missingRequired,
    missingOptional,
    onboardingCompleted: user.onboardingCompleted,
    redirectTo: onboardingStatus.redirectTo,
    profileComplete: missingRequired.length === 0,
  });
}
