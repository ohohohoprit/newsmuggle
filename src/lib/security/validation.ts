/**
 * Security validation — pure validators.
 */
import type { SecurityEventType, SecuritySeverity, AbuseFlagType } from '@/lib/security/types';
import { ALL_SECURITY_EVENT_TYPES, ALL_ABUSE_FLAG_TYPES } from '@/lib/security/types';
import { SecurityValidationError } from '@/lib/security/errors';

export function validateSecurityEventType(type: unknown): SecurityEventType | undefined {
  if (type === undefined || type === null) return undefined;
  if (typeof type !== 'string') {
    throw new SecurityValidationError('eventType must be a string.');
  }
  const trimmed = type.trim().toLowerCase() as SecurityEventType;
  if (!ALL_SECURITY_EVENT_TYPES.includes(trimmed)) {
    throw new SecurityValidationError(`eventType must be one of: ${ALL_SECURITY_EVENT_TYPES.join(', ')}.`);
  }
  return trimmed;
}

export function validateSeverity(severity: unknown): SecuritySeverity | undefined {
  if (severity === undefined || severity === null) return undefined;
  if (typeof severity !== 'string') {
    throw new SecurityValidationError('severity must be a string.');
  }
  const trimmed = severity.trim().toLowerCase();
  if (!['low', 'medium', 'high', 'critical'].includes(trimmed)) {
    throw new SecurityValidationError('severity must be one of: low, medium, high, critical.');
  }
  return trimmed as SecuritySeverity;
}

export function validateAbuseFlagType(type: unknown): AbuseFlagType | undefined {
  if (type === undefined || type === null) return undefined;
  if (typeof type !== 'string') {
    throw new SecurityValidationError('flagType must be a string.');
  }
  const trimmed = type.trim().toLowerCase() as AbuseFlagType;
  if (!ALL_ABUSE_FLAG_TYPES.includes(trimmed)) {
    throw new SecurityValidationError(`flagType must be one of: ${ALL_ABUSE_FLAG_TYPES.join(', ')}.`);
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

export function validateCacheKey(key: unknown): string {
  if (typeof key !== 'string' || !key.trim()) {
    throw new SecurityValidationError('Cache key is required.');
  }
  const trimmed = key.trim();
  if (trimmed.length > 500) {
    throw new SecurityValidationError('Cache key must be 500 characters or fewer.');
  }
  return trimmed;
}

export function validateCachePattern(pattern: unknown): string {
  if (typeof pattern !== 'string' || !pattern.trim()) {
    throw new SecurityValidationError('Cache pattern is required.');
  }
  return pattern.trim();
}

export function validateIncidentTitle(title: unknown): string {
  if (typeof title !== 'string' || !title.trim()) {
    throw new SecurityValidationError('Incident title is required.');
  }
  const trimmed = title.trim();
  if (trimmed.length > 200) {
    throw new SecurityValidationError('Title must be 200 characters or fewer.');
  }
  return trimmed;
}

export function validateIncidentSeverity(severity: unknown): string {
  if (severity === undefined || severity === null) return 'warning';
  if (typeof severity !== 'string') {
    throw new SecurityValidationError('severity must be a string.');
  }
  const trimmed = severity.trim().toLowerCase();
  if (!['info', 'warning', 'critical', 'maintenance'].includes(trimmed)) {
    throw new SecurityValidationError('severity must be one of: info, warning, critical, maintenance.');
  }
  return trimmed;
}

export function validateServiceName(serviceName: unknown): string | undefined {
  if (serviceName === undefined || serviceName === null) return undefined;
  if (typeof serviceName !== 'string') return undefined;
  const valid = ['database', 'ai_provider', 'billing', 'studio', 'notifications', 'global'];
  const trimmed = serviceName.trim().toLowerCase();
  if (!valid.includes(trimmed)) return undefined;
  return trimmed;
}
