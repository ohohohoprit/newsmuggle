/**
 * Notification shared types — used across the notification service,
 * delivery channels, event mapping, and API routes.
 */

// ===== Notification types + categories =====

export type NotificationType =
  | 'billing'
  | 'studio'
  | 'quota'
  | 'system'
  | 'tool'
  | 'workspace';

export const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  'billing', 'studio', 'quota', 'system', 'tool', 'workspace',
];

export type NotificationCategory =
  | 'subscription'
  | 'payment'
  | 'usage'
  | 'sync'
  | 'account'
  | 'security'
  | 'general';

export const ALL_CATEGORIES: NotificationCategory[] = [
  'subscription', 'payment', 'usage', 'sync', 'account', 'security', 'general',
];

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export const PRIORITY_RANK: Record<NotificationPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
};

export const ALL_PRIORITIES: NotificationPriority[] = ['low', 'normal', 'high', 'urgent'];

// ===== Delivery channels =====

export type DeliveryChannel = 'in_app' | 'email' | 'webhook';

export const ALL_CHANNELS: DeliveryChannel[] = ['in_app', 'email', 'webhook'];

export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

// ===== Event sources =====

export type EventSource = 'billing' | 'studio' | 'quota' | 'system' | 'tool';

export const ALL_SOURCES: EventSource[] = ['billing', 'studio', 'quota', 'system', 'tool'];

// ===== DTOs =====

export interface NotificationDTO {
  id: string;
  userId: string;
  workspaceId: string | null;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationPreferenceDTO {
  id: string;
  userId: string;
  category: NotificationCategory;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  webhookEnabled: boolean;
  minPriority: NotificationPriority;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliveryDTO {
  id: string;
  notificationId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  recipient: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationEventDTO {
  id: string;
  workspaceId: string | null;
  userId: string | null;
  eventType: string;
  source: EventSource;
  notificationId: string | null;
  processedAt: string | null;
  createdAt: string;
}

// ===== Creation input =====

export interface CreateNotificationInput {
  userId: string;
  workspaceId?: string | null;
  type: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  dedupKey?: string | null;
}

// ===== Event input =====

export interface RecordEventInput {
  workspaceId?: string | null;
  userId?: string | null;
  eventType: string;
  source: EventSource;
  payload: Record<string, unknown>;
}

// ===== Unread count =====

export interface UnreadCountResult {
  total: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

// ===== Job types =====

export type JobType =
  | 'quota_reset'
  | 'usage_snapshot'
  | 'threshold_check'
  | 'stale_check'
  | 'studio_sync'
  | 'notification_cleanup'
  | 'retry_failed'
  | 'delivery_retry';

export const ALL_JOB_TYPES: JobType[] = [
  'quota_reset',
  'usage_snapshot',
  'threshold_check',
  'stale_check',
  'studio_sync',
  'notification_cleanup',
  'retry_failed',
  'delivery_retry',
];

export type JobStatus = 'running' | 'completed' | 'failed' | 'partial';

export interface JobRunDTO {
  id: string;
  jobType: JobType;
  status: JobStatus;
  triggeredBy: 'system' | 'user' | 'cron';
  userId: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  errorMessage: string | null;
  result: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface JobResult {
  jobRunId: string;
  jobType: JobType;
  status: JobStatus;
  processed: number;
  created: number;
  failed: number;
  skipped: number;
  durationMs: number;
  errorMessage: string | null;
  result: Record<string, unknown>;
}
