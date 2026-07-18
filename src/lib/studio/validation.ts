/**
 * Studio validation — pure validators for all studio inputs.
 */
import type { SocialProviderSlug, SyncJobType } from '@/lib/studio/types';
import { ALL_SOCIAL_PROVIDERS } from '@/lib/studio/types';
import { StudioValidationError } from '@/lib/studio/errors';

const SYNC_TYPES: SyncJobType[] = ['full', 'incremental', 'metrics', 'content', 'audience'];

export function validateProvider(provider: unknown): SocialProviderSlug {
  if (typeof provider !== 'string' || !provider.trim()) {
    throw new StudioValidationError('Provider is required.');
  }
  const trimmed = provider.trim().toLowerCase() as SocialProviderSlug;
  if (!ALL_SOCIAL_PROVIDERS.includes(trimmed)) {
    throw new StudioValidationError(`Provider must be one of: ${ALL_SOCIAL_PROVIDERS.join(', ')}.`);
  }
  return trimmed;
}

export function validateSyncType(type: unknown): SyncJobType {
  if (type === undefined || type === null) return 'incremental';
  if (typeof type !== 'string') {
    throw new StudioValidationError('Sync type must be a string.');
  }
  const trimmed = type.trim().toLowerCase() as SyncJobType;
  if (!SYNC_TYPES.includes(trimmed)) {
    throw new StudioValidationError(`Sync type must be one of: ${SYNC_TYPES.join(', ')}.`);
  }
  return trimmed;
}

export function validateWorkspaceId(id: unknown): string | undefined {
  if (id === undefined || id === null) return undefined;
  if (typeof id !== 'string' || !id.trim()) return undefined;
  return id.trim();
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

export function validateContentType(type: unknown): string | undefined {
  if (type === undefined || type === null) return undefined;
  if (typeof type !== 'string') return undefined;
  const valid = ['video', 'post', 'reel', 'story', 'short'];
  const trimmed = type.trim().toLowerCase();
  if (!valid.includes(trimmed)) return undefined;
  return trimmed;
}

export function validateDateRange(since?: string | null, until?: string | null): { since?: Date; until?: Date } {
  const result: { since?: Date; until?: Date } = {};
  if (since) {
    const d = new Date(since);
    if (isNaN(d.getTime())) {
      throw new StudioValidationError('Invalid "since" date. Use ISO 8601 format.');
    }
    result.since = d;
  }
  if (until) {
    const d = new Date(until);
    if (isNaN(d.getTime())) {
      throw new StudioValidationError('Invalid "until" date. Use ISO 8601 format.');
    }
    result.until = d;
  }
  if (result.since && result.until && result.since > result.until) {
    throw new StudioValidationError('"since" date must be before "until" date.');
  }
  return result;
}
