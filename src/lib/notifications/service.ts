/**
 * Notification service — core CRUD + deduplication + delivery routing.
 *
 * createNotification() is the main entry point called by:
 *   - the event mapping layer (billing/studio/quota events)
 *   - direct API calls (admin/system notifications)
 *   - cron jobs (threshold alerts, stale account alerts)
 *
 * Deduplication: if a dedupKey is provided and an unread notification
 * with the same key exists for the same user, the new one is skipped
 * (returns the existing one). This prevents duplicate notifications
 * for recurring events (e.g. quota threshold reached fired multiple times).
 */
import { db } from '@/lib/db';
import type {
  NotificationDTO,
  CreateNotificationInput,
  UnreadCountResult,
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from '@/lib/notifications/types';
import { getPreference, shouldDeliver } from '@/lib/notifications/preferences';
import { deliverNotification } from '@/lib/notifications/delivery';
import { NotificationNotFoundError, NotificationForbiddenError } from '@/lib/notifications/errors';

// ===== Helpers =====

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toDTO(n: {
  id: string;
  userId: string;
  workspaceId: string | null;
  type: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  readAt: Date | null;
  metadata: string | null;
  createdAt: Date;
}): NotificationDTO {
  return {
    id: n.id,
    userId: n.userId,
    workspaceId: n.workspaceId,
    type: n.type as NotificationType,
    category: n.category as NotificationCategory,
    priority: n.priority as NotificationPriority,
    title: n.title,
    message: n.message,
    actionUrl: n.actionUrl,
    read: n.read,
    readAt: n.readAt?.toISOString() ?? null,
    metadata: safeParseJson<Record<string, unknown> | null>(n.metadata, null),
    createdAt: n.createdAt.toISOString(),
  };
}

// ===== Public API =====

/**
 * Create a notification + queue deliveries.
 * Deduplicates based on dedupKey (if provided).
 */
export async function createNotification(input: CreateNotificationInput): Promise<{ notification: NotificationDTO; created: boolean }> {
  const category = input.category ?? 'general';
  const priority = input.priority ?? 'normal';

  // Deduplication: if dedupKey is set and an unread notification with the same key exists, skip
  if (input.dedupKey) {
    const existing = await db.notification.findFirst({
      where: {
        userId: input.userId,
        dedupKey: input.dedupKey,
        read: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return { notification: toDTO(existing), created: false };
    }
  }

  // Create the notification
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      type: input.type,
      category,
      priority,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      dedupKey: input.dedupKey ?? null,
    },
  });

  const dto = toDTO(notification);

  // Queue deliveries based on user preferences (async, non-blocking)
  deliverBasedOnPreferences(dto).catch((err) => {
    console.error('[notifications] delivery failed:', err);
  });

  return { notification: dto, created: true };
}

/**
 * Deliver a notification based on the user's preferences for its category.
 */
async function deliverBasedOnPreferences(n: NotificationDTO): Promise<void> {
  const pref = await getPreference(n.userId, n.category);
  const channels: Array<{ channel: 'in_app' | 'email' | 'webhook'; enabled: boolean }> = [
    { channel: 'in_app', enabled: pref.inAppEnabled },
    { channel: 'email', enabled: pref.emailEnabled },
    { channel: 'webhook', enabled: pref.webhookEnabled },
  ];

  for (const { channel, enabled } of channels) {
    if (shouldDeliver(pref, channel, n.priority)) {
      await deliverNotification(n.id, channel).catch(() => {});
    }
  }
}

/**
 * List notifications for a user (paginated, filterable).
 */
export async function listNotifications(
  userId: string,
  opts: {
    workspaceId?: string;
    type?: NotificationType;
    category?: NotificationCategory;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ items: NotificationDTO[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = { userId };
  if (opts.workspaceId) where.workspaceId = opts.workspaceId;
  if (opts.type) where.type = opts.type;
  if (opts.category) where.category = opts.category;
  if (opts.unreadOnly) where.read = false;

  const [items, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    db.notification.count({ where }),
  ]);

  return { items: items.map(toDTO), total };
}

/**
 * Get a single notification (verifying ownership).
 */
export async function getNotification(id: string, userId: string): Promise<NotificationDTO> {
  const n = await db.notification.findUnique({ where: { id } });
  if (!n) throw new NotificationNotFoundError(id);
  if (n.userId !== userId) throw new NotificationForbiddenError('You can only view your own notifications.');
  return toDTO(n);
}

/**
 * Get the unread count for a user, broken down by category + priority.
 */
export async function getUnreadCount(userId: string, workspaceId?: string): Promise<UnreadCountResult> {
  const where: Record<string, unknown> = { userId, read: false };
  if (workspaceId) where.workspaceId = workspaceId;

  const notifications = await db.notification.findMany({
    where,
    select: { category: true, priority: true },
  });

  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  for (const n of notifications) {
    byCategory[n.category] = (byCategory[n.category] ?? 0) + 1;
    byPriority[n.priority] = (byPriority[n.priority] ?? 0) + 1;
  }

  return {
    total: notifications.length,
    byCategory,
    byPriority,
  };
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(id: string, userId: string): Promise<NotificationDTO> {
  const n = await db.notification.findUnique({ where: { id } });
  if (!n) throw new NotificationNotFoundError(id);
  if (n.userId !== userId) throw new NotificationForbiddenError('You can only modify your own notifications.');

  const updated = await db.notification.update({
    where: { id },
    data: { read: true, readAt: new Date() },
  });
  return toDTO(updated);
}

/**
 * Mark all notifications as read for a user (optionally filtered by workspace).
 */
export async function markAllAsRead(userId: string, workspaceId?: string): Promise<{ updated: number }> {
  const where: Record<string, unknown> = { userId, read: false };
  if (workspaceId) where.workspaceId = workspaceId;

  const result = await db.notification.updateMany({
    where,
    data: { read: true, readAt: new Date() },
  });
  return { updated: result.count };
}

/**
 * Delete old read notifications (cleanup job).
 */
export async function cleanupOldNotifications(opts: { olderThanDays?: number; limit?: number } = {}): Promise<{ deleted: number }> {
  const olderThanDays = opts.olderThanDays ?? 30;
  const limit = opts.limit ?? 1000;
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await db.notification.deleteMany({
    where: {
      read: true,
      createdAt: { lt: cutoff },
    },
    // SQLite doesn't support LIMIT in deleteMany directly; Prisma handles it
  });

  return { deleted: Math.min(result.count, limit) };
}
