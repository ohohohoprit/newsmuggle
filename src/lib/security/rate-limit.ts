/**
 * Rate limiting — token bucket algorithm with in-memory storage.
 *
 * Supports per-IP, per-user, per-workspace, and per-route scoping.
 * Buckets are stored in-memory (fast) with optional DB persistence
 * for cross-restart state (not enabled by default — in-memory is
 * sufficient for single-instance deployments).
 *
 * Usage:
 *   const result = await checkRateLimit('auth:login', { ip: '1.2.3.4' });
 *   if (!result.allowed) throw new RateLimitExceededError(...);
 */
import { DEFAULT_RATE_LIMITS, type RateLimitConfig, type RateLimitResult, type RateLimitScope } from '@/lib/security/types';
import { recordSecurityEvent } from '@/lib/security/events';

// ===== In-memory bucket store =====

interface Bucket {
  tokens: number;
  lastRefill: number; // timestamp ms
  violations: number;
  blockedUntil: number | null; // timestamp ms
}

const buckets = new Map<string, Bucket>();

// ===== Helpers =====

function buildKey(scope: RateLimitScope, identifier: string, route?: string): string {
  if (route) return `${scope}:${identifier}:${route}`;
  return `${scope}:${identifier}`;
}

function getNow(): number {
  return Date.now();
}

function refillBucket(bucket: Bucket, config: RateLimitConfig): void {
  const now = getNow();
  const elapsed = (now - bucket.lastRefill) / 1000; // seconds
  const refilled = elapsed * config.refillRate;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + refilled);
  bucket.lastRefill = now;
}

// ===== Public API =====

export interface RateLimitContext {
  ip?: string;
  userId?: string;
  workspaceId?: string;
  route?: string;
}

/**
 * Check + consume a token from the rate limit bucket.
 * Returns allowed=false if the bucket is empty or the caller is blocked.
 */
export async function checkRateLimit(
  routeKey: string,
  ctx: RateLimitContext,
): Promise<RateLimitResult> {
  const config = DEFAULT_RATE_LIMITS[routeKey] ?? DEFAULT_RATE_LIMITS['api:general'];

  // Determine scope: prefer user > workspace > IP
  let scope: RateLimitScope = 'ip';
  let identifier = ctx.ip ?? 'unknown';
  if (ctx.userId) {
    scope = 'user';
    identifier = ctx.userId;
  } else if (ctx.workspaceId) {
    scope = 'workspace';
    identifier = ctx.workspaceId;
  }

  const key = buildKey(scope, identifier, ctx.route);
  const now = getNow();

  // Check if blocked
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = {
      tokens: config.maxTokens,
      lastRefill: now,
      violations: 0,
      blockedUntil: null,
    };
    buckets.set(key, bucket);
  }

  // Check block
  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    const retryAfterMs = bucket.blockedUntil - now;
    return {
      allowed: false,
      remaining: 0,
      limit: config.maxTokens,
      resetAt: new Date(bucket.blockedUntil).toISOString(),
      retryAfterMs,
      blocked: true,
    };
  }

  // Refill tokens
  refillBucket(bucket, config);

  // Try to consume a token
  if (bucket.tokens < 1) {
    // Rate limited — increment violations
    bucket.violations++;
    const retryAfterMs = Math.ceil((1 - bucket.tokens) / config.refillRate * 1000);

    // Check if we should block
    if (bucket.violations >= config.violationsBeforeBlock) {
      bucket.blockedUntil = now + config.blockDurationMs;
      // Record security event
      await recordSecurityEvent({
        eventType: 'rate_limit_hit',
        severity: bucket.violations >= config.violationsBeforeBlock * 2 ? 'high' : 'medium',
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        ip: ctx.ip,
        path: ctx.route,
        riskScore: Math.min(100, bucket.violations * 20),
        payload: { routeKey, violations: bucket.violations, blockedUntil: bucket.blockedUntil },
      }).catch(() => {});
    }

    return {
      allowed: false,
      remaining: 0,
      limit: config.maxTokens,
      resetAt: new Date(now + retryAfterMs).toISOString(),
      retryAfterMs,
      blocked: false,
    };
  }

  // Consume token
  bucket.tokens -= 1;
  // Reset violations on successful request
  if (bucket.violations > 0) {
    bucket.violations = Math.max(0, bucket.violations - 1);
  }

  const resetAt = new Date(now + (config.maxTokens - bucket.tokens) / config.refillRate * 1000);

  return {
    allowed: true,
    remaining: Math.floor(bucket.tokens),
    limit: config.maxTokens,
    resetAt: resetAt.toISOString(),
    blocked: false,
  };
}

/**
 * Check if a caller is currently blocked (without consuming a token).
 */
export function isBlocked(routeKey: string, ctx: RateLimitContext): boolean {
  const config = DEFAULT_RATE_LIMITS[routeKey] ?? DEFAULT_RATE_LIMITS['api:general'];
  let scope: RateLimitScope = 'ip';
  let identifier = ctx.ip ?? 'unknown';
  if (ctx.userId) {
    scope = 'user';
    identifier = ctx.userId;
  } else if (ctx.workspaceId) {
    scope = 'workspace';
    identifier = ctx.workspaceId;
  }
  const key = buildKey(scope, identifier, ctx.route);
  const bucket = buckets.get(key);
  if (!bucket || !bucket.blockedUntil) return false;
  return bucket.blockedUntil > getNow();
}

/**
 * Clear all rate limit buckets (admin action).
 */
export function clearAllBuckets(): { cleared: number } {
  const count = buckets.size;
  buckets.clear();
  return { cleared: count };
}

/**
 * Clear buckets for a specific IP/user/workspace (admin action).
 */
export function clearBucketsForTarget(target: { ip?: string; userId?: string; workspaceId?: string }): { cleared: number } {
  let cleared = 0;
  for (const [key] of buckets) {
    if (
      (target.ip && key.includes(`ip:${target.ip}`)) ||
      (target.userId && key.includes(`user:${target.userId}`)) ||
      (target.workspaceId && key.includes(`workspace:${target.workspaceId}`))
    ) {
      buckets.delete(key);
      cleared++;
    }
  }
  return { cleared };
}

/**
 * Get stats for monitoring.
 */
export function getRateLimitStats(): { totalBuckets: number; blockedCount: number } {
  const now = getNow();
  let blockedCount = 0;
  for (const bucket of buckets.values()) {
    if (bucket.blockedUntil && bucket.blockedUntil > now) blockedCount++;
  }
  return { totalBuckets: buckets.size, blockedCount };
}
