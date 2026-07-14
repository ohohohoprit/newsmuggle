/**
 * Notification validation — pure validators.
 */
import type {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationCategory as Category,
} from '@/lib/notifications/types';
import { ALL_NOTIFICATION_TYPES, ALL_CATEGORIES, ALL_PRIORITIES } from '@/lib/notifications/types';
import { NotificationValidationError } from '@/lib/notifications/errors';

export function validateNotificationType(type: unknown): NotificationType {
  if (typeof type !== 'string' || !type.trim()) {
    throw new NotificationValidationError('Notification type is required.');
  }
  const trimmed = type.trim().toLowerCase() as NotificationType;
  if (!ALL_NOTIFICATION_TYPES.includes(trimmed)) {
    throw new NotificationValidationError(`Type must be one of: ${ALL_NOTIFICATION_TYPES.join(', ')}.`);
  }
  return trimmed;
}

export function validateCategory(category: unknown): NotificationCategory {
  if (category === undefined || category === null) return 'general';
  if (typeof category !== 'string') {
    throw new NotificationValidationError('Category must be a string.');
  }
  const trimmed = category.trim().toLowerCase() as NotificationCategory;
  if (!ALL_CATEGORIES.includes(trimmed)) {
    throw new NotificationValidationError(`Category must be one of: ${ALL_CATEGORIES.join(', ')}.`);
  }
  return trimmed;
}

export function validatePriority(priority: unknown): NotificationPriority {
  if (priority === undefined || priority === null) return 'normal';
  if (typeof priority !== 'string') {
    throw new NotificationValidationError('Priority must be a string.');
  }
  const trimmed = priority.trim().toLowerCase() as NotificationPriority;
  if (!ALL_PRIORITIES.includes(trimmed)) {
    throw new NotificationValidationError(`Priority must be one of: ${ALL_PRIORITIES.join(', ')}.`);
  }
  return trimmed;
}

export function validateTitle(title: unknown): string {
  if (typeof title !== 'string' || !title.trim()) {
    throw new NotificationValidationError('Title is required.');
  }
  const trimmed = title.trim();
  if (trimmed.length > 200) {
    throw new NotificationValidationError('Title must be 200 characters or fewer.');
  }
  return trimmed;
}

export function validateMessage(message: unknown): string {
  if (typeof message !== 'string' || !message.trim()) {
    throw new NotificationValidationError('Message is required.');
  }
  const trimmed = message.trim();
  if (trimmed.length > 2000) {
    throw new NotificationValidationError('Message must be 2000 characters or fewer.');
  }
  return trimmed;
}

export function validateActionUrl(url: unknown): string | null {
  if (url === undefined || url === null) return null;
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.length > 500) {
    throw new NotificationValidationError('actionUrl must be 500 characters or fewer.');
  }
  return trimmed;
}

export function validateDedupKey(key: unknown): string | null {
  if (key === undefined || key === null) return null;
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (trimmed.length > 200) {
    throw new NotificationValidationError('dedupKey must be 200 characters or fewer.');
  }
  return trimmed;
}

export function validateLimit(raw: unknown, def = 50, max = 200): number {
  if (raw === undefined || raw === null) return def;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(max, Math.floor(n));
}

export function validateOffset(raw: unknown): number {
  if (raw === undefined || raw === null) return 0;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function validatePreferenceCategory(category: unknown): Category {
  return validateCategory(category);
}

export function validateBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new NotificationValidationError(`${field} must be a boolean.`);
  }
  return value;
}
