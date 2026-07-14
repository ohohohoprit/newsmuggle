/**
 * Onboarding Service Layer
 * Handles onboarding flow logic, profile completion tracking,
 * and redirect decisions for first-login vs returning users.
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/auth';

// ===== Types =====

export interface OnboardingStep {
  key: string;
  label: string;
  completed: boolean;
}

export interface OnboardingStatus {
  completed: boolean;
  steps: OnboardingStep[];
  completionPercentage: number;
  redirectTo: string; // URL the frontend should navigate to
}

export interface OnboardingInput {
  name?: string;
  username?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  language?: string;
  creatorCategory?: string;
  socialLinks?: Record<string, string>;
  avatar?: string;
}

// ===== Onboarding Steps Definition =====

const ONBOARDING_STEPS = [
  { key: 'profile_basics', label: 'Profile Basics', fields: ['name', 'username'] },
  { key: 'profile_details', label: 'Profile Details', fields: ['bio', 'country', 'timezone', 'language', 'creatorCategory'] },
  { key: 'social_links', label: 'Social Links', fields: ['socialLinks'] },
  { key: 'avatar', label: 'Profile Picture', fields: ['avatar'] },
] as const;

// ===== Service Functions =====

/**
 * Get onboarding status for a user.
 * Returns which steps are completed, percentage, and redirect URL.
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      username: true,
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
    return {
      completed: false,
      steps: [],
      completionPercentage: 0,
      redirectTo: '/api/auth/login',
    };
  }

  // If already completed onboarding, redirect to studio
  if (user.onboardingCompleted) {
    return {
      completed: true,
      steps: ONBOARDING_STEPS.map(s => ({ key: s.key, label: s.label, completed: true })),
      completionPercentage: 100,
      redirectTo: '/studio',
    };
  }

  // Check each step
  const steps: OnboardingStep[] = ONBOARDING_STEPS.map(step => {
    let completed = false;
    if (step.key === 'profile_basics') {
      completed = !!(user.name && user.username);
    } else if (step.key === 'profile_details') {
      completed = !!(user.bio && user.country && user.timezone && user.language && user.creatorCategory);
    } else if (step.key === 'social_links') {
      completed = user.socialAccounts.length > 0;
    } else if (step.key === 'avatar') {
      completed = !!user.avatar;
    }
    return { key: step.key, label: step.label, completed };
  });

  const completedCount = steps.filter(s => s.completed).length;
  const completionPercentage = Math.round((completedCount / steps.length) * 100);

  // If all steps are completed but onboardingCompleted flag is still false, auto-complete
  if (completedCount === steps.length) {
    await db.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });
    return {
      completed: true,
      steps: steps.map(s => ({ ...s, completed: true })),
      completionPercentage: 100,
      redirectTo: '/studio',
    };
  }

  return {
    completed: false,
    steps,
    completionPercentage,
    redirectTo: '/onboarding',
  };
}

/**
 * Update onboarding step data for a user.
 * Saves the provided fields and re-checks completion.
 */
export async function updateOnboardingStep(
  userId: string,
  input: OnboardingInput,
  req: Request
): Promise<OnboardingStatus> {
  const updateData: Record<string, string | undefined> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.username !== undefined) updateData.username = input.username;
  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.country !== undefined) updateData.country = input.country;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.language !== undefined) updateData.language = input.language;
  if (input.creatorCategory !== undefined) updateData.creatorCategory = input.creatorCategory;
  if (input.avatar !== undefined) updateData.avatar = input.avatar;

  if (Object.keys(updateData).length > 0) {
    await db.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  // Handle social links separately (they go into SocialAccount table)
  if (input.socialLinks) {
    for (const [platform, username] of Object.entries(input.socialLinks)) {
      if (username && username.trim()) {
        await db.socialAccount.upsert({
          where: {
            userId_platform: { userId, platform },
          },
          update: { username: username.trim() },
          create: {
            userId,
            platform,
            username: username.trim(),
          },
        });
      }
    }
  }

  await auditLog('onboarding_update', userId, req, 'success', { fields: Object.keys(updateData) });

  // Re-check status
  return getOnboardingStatus(userId);
}

/**
 * Force-complete onboarding for a user (skip remaining steps).
 */
export async function completeOnboarding(userId: string, req: Request): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { onboardingCompleted: true },
  });
  await auditLog('onboarding_complete', userId, req);
}

/**
 * Reset onboarding for a user (admin action or user request).
 */
export async function resetOnboarding(userId: string, req: Request): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { onboardingCompleted: false },
  });
  await auditLog('onboarding_reset', userId, req);
}

/**
 * Determine where to redirect a user after login.
 * - First login (onboarding incomplete): redirect to /onboarding
 * - Returning user (onboarding complete): redirect to /studio
 */
export async function getPostLoginRedirect(userId: string): Promise<string> {
  const status = await getOnboardingStatus(userId);
  return status.redirectTo;
}
