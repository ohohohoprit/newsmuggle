/**
 * Notification preferences service — resolves user preferences per category.
 *
 * Defaults: in_app=true, email=true, webhook=false, minPriority=low
 * Users can override per category via the API.
 */
import { db } from '@/lib/db';
import type { NotificationCategory, NotificationPriority, NotificationPreferenceDTO } from '@/lib/notifications/types';
import { PRIORITY_RANK } from '@/lib/notifications/types';

const DEFAULT_PREFERENCES = {
  inAppEnabled: true,
  emailEnabled: true,
  webhookEnabled: false,
  minPriority: 'low' as NotificationPriority,
};

function toDTO(pref: {
  id: string;
  userId: string;
  category: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  webhookEnabled: boolean;
  minPriority: string;
  createdAt: Date;
  updatedAt: Date;
}): NotificationPreferenceDTO {
  return {
    id: pref.id,
    userId: pref.userId,
    category: pref.category as NotificationCategory,
    inAppEnabled: pref.inAppEnabled,
    emailEnabled: pref.emailEnabled,
    webhookEnabled: pref.webhookEnabled,
    minPriority: pref.minPriority as NotificationPriority,
    createdAt: pref.createdAt.toISOString(),
    updatedAt: pref.updatedAt.toISOString(),
  };
}

/** Get all preferences for a user (creates defaults if none exist). */
export async function getPreferences(userId: string): Promise<NotificationPreferenceDTO[]> {
  const prefs = await db.notificationPreference.findMany({
    where: { userId },
    orderBy: { category: 'asc' },
  });
  return prefs.map(toDTO);
}

/** Get a specific preference (or default if not set). */
export async function getPreference(userId: string, category: NotificationCategory): Promise<{
  inAppEnabled: boolean;
  emailEnabled: boolean;
  webhookEnabled: boolean;
  minPriority: NotificationPriority;
}> {
  const pref = await db.notificationPreference.findUnique({
    where: { userId_category: { userId, category } },
  });
  if (!pref) return DEFAULT_PREFERENCES;
  return {
    inAppEnabled: pref.inAppEnabled,
    emailEnabled: pref.emailEnabled,
    webhookEnabled: pref.webhookEnabled,
    minPriority: pref.minPriority as NotificationPriority,
  };
}

/** Upsert a preference. */
export async function upsertPreference(
  userId: string,
  category: NotificationCategory,
  updates: {
    inAppEnabled?: boolean;
    emailEnabled?: boolean;
    webhookEnabled?: boolean;
    minPriority?: NotificationPriority;
  },
): Promise<NotificationPreferenceDTO> {
  const pref = await db.notificationPreference.upsert({
    where: { userId_category: { userId, category } },
    update: {
      ...(updates.inAppEnabled !== undefined ? { inAppEnabled: updates.inAppEnabled } : {}),
      ...(updates.emailEnabled !== undefined ? { emailEnabled: updates.emailEnabled } : {}),
      ...(updates.webhookEnabled !== undefined ? { webhookEnabled: updates.webhookEnabled } : {}),
      ...(updates.minPriority !== undefined ? { minPriority: updates.minPriority } : {}),
    },
    create: {
      userId,
      category,
      inAppEnabled: updates.inAppEnabled ?? DEFAULT_PREFERENCES.inAppEnabled,
      emailEnabled: updates.emailEnabled ?? DEFAULT_PREFERENCES.emailEnabled,
      webhookEnabled: updates.webhookEnabled ?? DEFAULT_PREFERENCES.webhookEnabled,
      minPriority: updates.minPriority ?? DEFAULT_PREFERENCES.minPriority,
    },
  });
  return toDTO(pref);
}

/**
 * Check if a notification should be delivered via a specific channel,
 * respecting the user's preferences + priority threshold.
 */
export function shouldDeliver(
  pref: { inAppEnabled: boolean; emailEnabled: boolean; webhookEnabled: boolean; minPriority: NotificationPriority },
  channel: 'in_app' | 'email' | 'webhook',
  priority: NotificationPriority,
): boolean {
  // Check priority threshold
  if (PRIORITY_RANK[priority] < PRIORITY_RANK[pref.minPriority]) {
    return false;
  }
  switch (channel) {
    case 'in_app': return pref.inAppEnabled;
    case 'email': return pref.emailEnabled;
    case 'webhook': return pref.webhookEnabled;
    default: return false;
  }
}
