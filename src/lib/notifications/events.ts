/**
 * Notification event mapping — translates business events from billing,
 * studio, quota, and tool services into user-facing notifications.
 *
 * This is the SINGLE place where event-to-notification mapping rules live.
 * Business services call `emitNotificationEvent()` which:
 *   1. Records the event in NotificationEvent table
 *   2. Looks up the mapping rule
 *   3. Creates the notification (with dedup key)
 *   4. Queues deliveries
 *
 * Event naming convention: <source>.<event_name>
 *   - billing.subscription_created
 *   - billing.payment_failed
 *   - studio.sync_completed
 *   - quota.threshold_reached
 *   - etc.
 */
import { db } from '@/lib/db';
import type { EventSource, NotificationType, NotificationCategory, NotificationPriority, RecordEventInput } from '@/lib/notifications/types';
import { createNotification } from '@/lib/notifications/service';

// ===== Event mapping rules =====

interface NotificationMapping {
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  titleTemplate: (payload: Record<string, unknown>) => string;
  messageTemplate: (payload: Record<string, unknown>) => string;
  actionUrl?: (payload: Record<string, unknown>) => string | null;
  dedupKey?: (payload: Record<string, unknown>) => string | null;
}

const MAPPINGS: Record<string, NotificationMapping> = {
  // ===== Billing events =====
  'billing.subscription_created': {
    type: 'billing',
    category: 'subscription',
    priority: 'normal',
    titleTemplate: () => 'Subscription Activated',
    messageTemplate: (p) => `Your ${p.planSlug ?? ''} subscription is now active. Enjoy your new features!`,
    actionUrl: () => '/api/billing/status',
  },
  'billing.subscription_renewed': {
    type: 'billing',
    category: 'subscription',
    priority: 'normal',
    titleTemplate: () => 'Subscription Renewed',
    messageTemplate: (p) => `Your subscription has been renewed for the next billing period.`,
    actionUrl: () => '/api/billing/status',
  },
  'billing.subscription_upgraded': {
    type: 'billing',
    category: 'subscription',
    priority: 'high',
    titleTemplate: () => 'Plan Upgraded',
    messageTemplate: (p) => `Your plan has been upgraded to ${p.planSlug ?? 'a higher tier'}. New features are now available.`,
    actionUrl: () => '/api/billing/status',
  },
  'billing.subscription_downgraded': {
    type: 'billing',
    category: 'subscription',
    priority: 'normal',
    titleTemplate: () => 'Plan Downgrade Scheduled',
    messageTemplate: (p) => `Your plan will be downgraded to ${p.planSlug ?? 'a lower tier'} at the end of the current period.`,
    actionUrl: () => '/api/billing/status',
  },
  'billing.subscription_canceled': {
    type: 'billing',
    category: 'subscription',
    priority: 'high',
    titleTemplate: () => 'Subscription Canceled',
    messageTemplate: (p) => `Your subscription has been canceled. You'll retain access until ${p.periodEnd ?? 'the end of the period'}.`,
    actionUrl: () => '/api/billing/status',
  },
  'billing.payment_succeeded': {
    type: 'billing',
    category: 'payment',
    priority: 'normal',
    titleTemplate: () => 'Payment Successful',
    messageTemplate: (p) => `Your payment of ${p.amount ?? ''} ${p.currency ?? ''} was processed successfully.`,
    actionUrl: () => '/api/billing/invoices',
  },
  'billing.payment_failed': {
    type: 'billing',
    category: 'payment',
    priority: 'urgent',
    titleTemplate: () => 'Payment Failed',
    messageTemplate: (p) => `Your payment of ${p.amount ?? ''} ${p.currency ?? ''} failed. Please update your payment method to avoid service interruption.`,
    actionUrl: () => '/api/billing/status',
  },
  'billing.invoice_generated': {
    type: 'billing',
    category: 'payment',
    priority: 'low',
    titleTemplate: () => 'Invoice Available',
    messageTemplate: (p) => `A new invoice for ${p.amount ?? ''} ${p.currency ?? ''} is available.`,
    actionUrl: () => '/api/billing/invoices',
  },

  // ===== Quota events =====
  'quota.threshold_reached': {
    type: 'quota',
    category: 'usage',
    priority: 'high',
    titleTemplate: (p) => `${p.threshold ?? ''}% Usage Reached`,
    messageTemplate: (p) => `You've used ${p.percentUsed ?? p.threshold ?? ''}% of your monthly generation limit (${p.used ?? 0}/${p.limit ?? 0}). Consider upgrading your plan.`,
    actionUrl: () => '/api/billing/usage',
    dedupKey: (p) => `quota:threshold:${p.workspaceId ?? 'unknown'}:${p.threshold ?? 0}:${p.periodKey ?? ''}`,
  },
  'quota.exceeded': {
    type: 'quota',
    category: 'usage',
    priority: 'urgent',
    titleTemplate: () => 'Monthly Limit Reached',
    messageTemplate: (p) => `You've reached your monthly generation limit of ${p.limit ?? 0}. Upgrade your plan to continue generating content.`,
    actionUrl: () => '/api/billing/plans',
    dedupKey: (p) => `quota:exceeded:${p.workspaceId ?? 'unknown'}:${p.periodKey ?? ''}`,
  },
  'quota.reset': {
    type: 'quota',
    category: 'usage',
    priority: 'low',
    titleTemplate: () => 'Monthly Quota Reset',
    messageTemplate: (p) => `Your monthly generation quota has been reset. You now have ${p.limit ?? 0} generations available.`,
    actionUrl: () => '/api/billing/usage',
  },

  // ===== Studio events =====
  'studio.sync_completed': {
    type: 'studio',
    category: 'sync',
    priority: 'low',
    titleTemplate: () => 'Studio Sync Complete',
    messageTemplate: (p) => `Synced ${p.itemsSynced ?? 0} items from ${p.provider ?? 'your account'}.`,
    actionUrl: () => '/api/studio/snapshots',
  },
  'studio.sync_failed': {
    type: 'studio',
    category: 'sync',
    priority: 'high',
    titleTemplate: () => 'Studio Sync Failed',
    messageTemplate: (p) => `Sync failed for ${p.provider ?? 'your account'}: ${p.error ?? 'unknown error'}. Please reconnect the account.`,
    actionUrl: () => '/api/studio/accounts',
  },
  'studio.account_stale': {
    type: 'studio',
    category: 'account',
    priority: 'normal',
    titleTemplate: () => 'Account Data is Stale',
    messageTemplate: (p) => `Your ${p.provider ?? 'social'} account hasn't synced in over 24 hours. Sync now to get fresh data.`,
    actionUrl: (p) => '/api/studio/sync/' + (p.provider ?? ''),
    dedupKey: (p) => `studio:stale:${p.workspaceId ?? 'unknown'}:${p.provider ?? 'unknown'}`,
  },
  'studio.account_disconnected': {
    type: 'studio',
    category: 'account',
    priority: 'high',
    titleTemplate: () => 'Account Disconnected',
    messageTemplate: (p) => `Your ${p.provider ?? 'social'} account has been disconnected. Reconnect to resume syncing.`,
    actionUrl: () => '/api/studio/accounts',
  },

  // ===== System events =====
  'system.job_failed': {
    type: 'system',
    category: 'general',
    priority: 'high',
    titleTemplate: () => 'Background Job Failed',
    messageTemplate: (p) => `A background job (${p.jobType ?? 'unknown'}) failed: ${p.error ?? 'unknown error'}. Our team has been notified.`,
  },
};

// ===== Public API =====

/**
 * Emit a notification event. Records the event + creates a notification
 * if a mapping exists.
 *
 * This is the function business services call. They don't need to know
 * about notification formatting — just the event type + payload.
 */
export async function emitNotificationEvent(
  input: RecordEventInput,
): Promise<{ eventId: string; notificationCreated: boolean; notificationId: string | null }> {
  // Record the event
  const event = await db.notificationEvent.create({
    data: {
      workspaceId: input.workspaceId ?? null,
      userId: input.userId ?? null,
      eventType: input.eventType,
      source: input.source,
      payload: JSON.stringify(input.payload ?? {}),
    },
  });

  // Look up the mapping
  const mapping = MAPPINGS[input.eventType];
  if (!mapping) {
    // No mapping — just record the event, no notification
    await db.notificationEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
    return { eventId: event.id, notificationCreated: false, notificationId: null };
  }

  // Resolve the target user
  let userId = input.userId;
  if (!userId && input.workspaceId) {
    // Notify the workspace owner
    const workspace = await db.workspace.findUnique({
      where: { id: input.workspaceId },
      select: { ownerId: true },
    });
    userId = workspace?.ownerId;
  }

  if (!userId) {
    // Can't create a notification without a user
    await db.notificationEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
    return { eventId: event.id, notificationCreated: false, notificationId: null };
  }

  // Create the notification
  const { notification, created } = await createNotification({
    userId,
    workspaceId: input.workspaceId ?? null,
    type: mapping.type,
    category: mapping.category,
    priority: mapping.priority,
    title: mapping.titleTemplate(input.payload),
    message: mapping.messageTemplate(input.payload),
    actionUrl: mapping.actionUrl ? mapping.actionUrl(input.payload) : null,
    metadata: input.payload,
    dedupKey: mapping.dedupKey ? mapping.dedupKey(input.payload) : null,
  });

  // Link the event to the notification
  await db.notificationEvent.update({
    where: { id: event.id },
    data: {
      processedAt: new Date(),
      notificationId: notification.id,
    },
  });

  return { eventId: event.id, notificationCreated: created, notificationId: notification.id };
}

/**
 * Get the list of supported event types (for admin/debugging).
 */
export function getSupportedEventTypes(): string[] {
  return Object.keys(MAPPINGS);
}
