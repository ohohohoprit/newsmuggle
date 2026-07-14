/**
 * Cache service — in-memory cache with TTL + pattern invalidation.
 *
 * Hot paths cached:
 *   - plans:list (public plan catalog, 5 min TTL)
 *   - plans:<slug> (single plan, 5 min TTL)
 *   - entitlements:<workspaceId> (workspace entitlements, 60s TTL)
 *   - notifications:unread-count:<userId> (unread count, 30s TTL)
 *   - tools:list (tool list, 60s TTL — already cached in registry.ts)
 *   - tools:<slug> (single tool, 60s TTL — already cached in registry.ts)
 *   - billing:status:<workspaceId> (billing status, 30s TTL)
 *   - studio:snapshot:<workspaceId> (studio snapshot, 60s TTL)
 *
 * Invalidation:
 *   - By exact key: cache.delete('plans:creator')
 *   - By pattern: cache.deletePattern('plans:*') — clears all plan caches
 *   - By namespace: cache.clearNamespace('plans')
 *
 * The cache is in-memory (Map-based). For multi-instance deployments,
 * replace the store with Redis (same interface).
 */
import { db } from '@/lib/db';

// ===== Cache entry =====

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hitCount: number;
  sizeBytes: number;
}

// ===== In-memory store =====

const store = new Map<string, CacheEntry<unknown>>();

// ===== Helpers =====

function getNow(): number {
  return Date.now();
}

function estimateSize(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

// ===== Public API =====

/**
 * Get a value from the cache. Returns null if not found or expired.
 */
export function get<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < getNow()) {
    store.delete(key);
    return null;
  }
  entry.hitCount++;
  return entry.value as T;
}

/**
 * Set a value in the cache with a TTL.
 */
export function set<T>(key: string, value: T, ttlSeconds = 60): void {
  // Don't cache null/undefined
  if (value === null || value === undefined) return;

  const sizeBytes = estimateSize(value);
  // Don't cache very large values (> 1MB)
  if (sizeBytes > 1_000_000) return;

  store.set(key, {
    value,
    expiresAt: getNow() + ttlSeconds * 1000,
    hitCount: 0,
    sizeBytes,
  });

  // Also persist to DB (best-effort, for cross-restart persistence)
  persistToDb(key, value, ttlSeconds).catch(() => {});
}

/**
 * Get a value from the cache, or compute it if not present.
 * The compute function is only called if the cache misses.
 */
export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const cached = get<T>(key);
  if (cached !== null) return cached;

  const value = await compute();
  set(key, value, ttlSeconds);
  return value;
}

/**
 * Delete a specific cache entry.
 */
export function deleteKey(key: string): boolean {
  return store.delete(key);
}

/**
 * Delete all cache entries matching a pattern (supports * wildcard).
 * Example: deletePattern('plans:*') clears all plan caches.
 */
export function deletePattern(pattern: string): number {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  let deleted = 0;
  for (const key of store.keys()) {
    if (regex.test(key)) {
      store.delete(key);
      deleted++;
    }
  }
  // Also clear from DB
  clearDbPattern(pattern).catch(() => {});
  return deleted;
}

/**
 * Clear all cache entries in a namespace (prefix before ':').
 * Example: clearNamespace('plans') clears 'plans:list', 'plans:creator', etc.
 */
export function clearNamespace(namespace: string): number {
  return deletePattern(`${namespace}:*`);
}

/**
 * Clear the entire cache.
 */
export function clearAll(): number {
  const count = store.size;
  store.clear();
  // Also clear DB cache
  db.cacheEntry.deleteMany({}).catch(() => {});
  return count;
}

/**
 * Get cache stats for monitoring.
 */
export function getStats(): {
  totalEntries: number;
  totalSizeBytes: number;
  totalHits: number;
  byNamespace: Record<string, { entries: number; sizeBytes: number; hits: number }>;
} {
  let totalSizeBytes = 0;
  let totalHits = 0;
  const byNamespace: Record<string, { entries: number; sizeBytes: number; hits: number }> = {};

  for (const [key, entry] of store.entries()) {
    const namespace = key.split(':')[0] ?? 'unknown';
    if (!byNamespace[namespace]) {
      byNamespace[namespace] = { entries: 0, sizeBytes: 0, hits: 0 };
    }
    byNamespace[namespace].entries++;
    byNamespace[namespace].sizeBytes += entry.sizeBytes;
    byNamespace[namespace].hits += entry.hitCount;
    totalSizeBytes += entry.sizeBytes;
    totalHits += entry.hitCount;
  }

  return {
    totalEntries: store.size,
    totalSizeBytes,
    totalHits,
    byNamespace,
  };
}

/**
 * Clean up expired entries (called periodically).
 */
export function cleanup(): { removed: number } {
  const now = getNow();
  let removed = 0;
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt < now) {
      store.delete(key);
      removed++;
    }
  }
  return { removed };
}

// ===== DB persistence (best-effort) =====

async function persistToDb(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await db.cacheEntry.upsert({
      where: { key },
      update: {
        value: serialized,
        ttlSeconds,
        expiresAt,
        sizeBytes: serialized.length,
      },
      create: {
        key,
        value: serialized,
        ttlSeconds,
        expiresAt,
        sizeBytes: serialized.length,
      },
    });
  } catch {
    // best-effort — don't fail if DB is unavailable
  }
}

async function clearDbPattern(pattern: string): Promise<void> {
  try {
    // SQLite doesn't support LIKE with wildcards in deleteMany directly,
    // but Prisma's contains + startsWith can work for simple patterns
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      await db.cacheEntry.deleteMany({
        where: { key: { startsWith: prefix } },
      });
    } else {
      await db.cacheEntry.deleteMany({
        where: { key: pattern },
      });
    }
  } catch {
    // best-effort
  }
}

// ===== Cache key builders (convention) =====

export const CacheKeys = {
  plansList: () => 'plans:list',
  plan: (slug: string) => `plans:${slug}`,
  entitlements: (workspaceId: string) => `entitlements:${workspaceId}`,
  notificationUnreadCount: (userId: string) => `notifications:unread-count:${userId}`,
  billingStatus: (workspaceId: string) => `billing:status:${workspaceId}`,
  studioSnapshot: (workspaceId: string) => `studio:snapshot:${workspaceId}`,
  studioMetrics: (workspaceId: string) => `studio:metrics:${workspaceId}`,
};
