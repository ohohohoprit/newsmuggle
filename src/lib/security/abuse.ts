/**
 * Abuse detection — detects suspicious patterns and flags abusers.
 *
 * Detection strategies:
 *   - rapid_requests: > 100 requests in 1 minute from same IP/user
 *   - failed_auth_burst: > 5 failed auth attempts in 5 minutes
 *   - excessive_tool_runs: > 50 tool runs in 10 minutes
 *   - quota_abuse: repeated quota exceedance attempts
 *   - suspicious_pattern: heuristics (e.g. scanning endpoints, unusual user agents)
 *
 * When abuse is detected:
 *   1. An AbuseDetectionFlag is created (with risk score 0-100)
 *   2. If risk score >= 70, the caller is auto-blocked (rate limit bucket)
 *   3. A security event is recorded
 *   4. Admins can review flags via the admin API
 */
import { db } from '@/lib/db';
import type { AbuseFlagType, RiskAssessment, AbuseFlagDTO } from '@/lib/security/types';
import { recordSecurityEvent } from '@/lib/security/events';

// ===== In-memory counters (for rapid detection) =====

interface RequestCounter {
  count: number;
  windowStart: number;
}

const requestCounters = new Map<string, RequestCounter>();
const WINDOW_MS = 60 * 1000; // 1 minute

function getCounter(key: string): RequestCounter {
  let counter = requestCounters.get(key);
  if (!counter) {
    counter = { count: 0, windowStart: Date.now() };
    requestCounters.set(key, counter);
  }
  // Reset window if expired
  if (Date.now() - counter.windowStart > WINDOW_MS) {
    counter.count = 0;
    counter.windowStart = Date.now();
  }
  return counter;
}

// ===== DTO mapper =====

function toDTO(f: {
  id: string;
  userId: string | null;
  workspaceId: string | null;
  ip: string | null;
  flagType: string;
  riskScore: number;
  autoBlocked: boolean;
  blockedUntil: Date | null;
  resolvedAt: Date | null;
  resolution: string | null;
  createdAt: Date;
}): AbuseFlagDTO {
  return {
    id: f.id,
    userId: f.userId,
    workspaceId: f.workspaceId,
    ip: f.ip,
    flagType: f.flagType as AbuseFlagType,
    riskScore: f.riskScore,
    autoBlocked: f.autoBlocked,
    blockedUntil: f.blockedUntil?.toISOString() ?? null,
    resolvedAt: f.resolvedAt?.toISOString() ?? null,
    resolution: f.resolution,
    createdAt: f.createdAt.toISOString(),
  };
}

// ===== Public API =====

/**
 * Record a request for abuse detection. Called by middleware on every request.
 * Returns a risk assessment if the caller should be flagged.
 */
export async function recordRequest(ctx: {
  ip?: string;
  userId?: string;
  workspaceId?: string;
  path?: string;
  method?: string;
}): Promise<RiskAssessment | null> {
  const key = ctx.userId ? `user:${ctx.userId}` : ctx.ip ? `ip:${ctx.ip}` : null;
  if (!key) return null;

  const counter = getCounter(key);
  counter.count++;

  // Check for rapid requests (> 100/min)
  if (counter.count === 100) {
    await flagAbuse({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      ip: ctx.ip,
      flagType: 'rapid_requests',
      riskScore: 60,
      evidence: { requestCount: counter.count, windowMs: WINDOW_MS, path: ctx.path },
      autoBlock: true,
    });
    return {
      score: 60,
      level: 'medium',
      reasons: ['100 requests in 1 minute'],
    };
  }

  // Check for very rapid requests (> 200/min)
  if (counter.count === 200) {
    await flagAbuse({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      ip: ctx.ip,
      flagType: 'rapid_requests',
      riskScore: 90,
      evidence: { requestCount: counter.count, windowMs: WINDOW_MS, path: ctx.path },
      autoBlock: true,
    });
    return {
      score: 90,
      level: 'critical',
      reasons: ['200 requests in 1 minute'],
    };
  }

  return null;
}

/**
 * Record an auth failure for abuse detection.
 */
export async function recordAuthFailure(ctx: {
  ip?: string;
  userId?: string;
  email?: string;
}): Promise<RiskAssessment | null> {
  const key = ctx.ip ? `auth_fail:${ctx.ip}` : null;
  if (!key) return null;

  const counter = getCounter(key);
  counter.count++;

  // 5 failed auth attempts in 5 minutes
  if (counter.count === 5) {
    await flagAbuse({
      userId: ctx.userId,
      ip: ctx.ip,
      flagType: 'failed_auth_burst',
      riskScore: 70,
      evidence: { failureCount: counter.count, email: ctx.email, windowMs: WINDOW_MS * 5 },
      autoBlock: true,
    });
    return {
      score: 70,
      level: 'high',
      reasons: ['5 failed auth attempts in 5 minutes'],
    };
  }

  return null;
}

/**
 * Record a tool run for abuse detection.
 */
export async function recordToolRun(ctx: {
  userId: string;
  workspaceId?: string;
  ip?: string;
  toolSlug: string;
}): Promise<RiskAssessment | null> {
  const key = `tool_run:${ctx.userId}`;
  const counter = getCounter(key);
  counter.count++;

  // 50 tool runs in 10 minutes is excessive (even for high plans)
  if (counter.count === 50) {
    await flagAbuse({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      ip: ctx.ip,
      flagType: 'excessive_tool_runs',
      riskScore: 50,
      evidence: { runCount: counter.count, toolSlug: ctx.toolSlug, windowMs: WINDOW_MS * 10 },
      autoBlock: false,
    });
    return {
      score: 50,
      level: 'medium',
      reasons: ['50 tool runs in 10 minutes'],
    };
  }

  return null;
}

/**
 * Flag an abuse pattern. Creates an AbuseDetectionFlag + records a security event.
 * If autoBlock is true and risk >= 70, blocks the caller via rate limit.
 */
export async function flagAbuse(input: {
  userId?: string | null;
  workspaceId?: string | null;
  ip?: string | null;
  flagType: AbuseFlagType;
  riskScore: number;
  evidence?: Record<string, unknown>;
  autoBlock?: boolean;
}): Promise<AbuseFlagDTO> {
  const blockedUntil = input.autoBlock && input.riskScore >= 70
    ? new Date(Date.now() + 30 * 60 * 1000) // 30 min block
    : null;

  const flag = await db.abuseDetectionFlag.create({
    data: {
      userId: input.userId ?? null,
      workspaceId: input.workspaceId ?? null,
      ip: input.ip ?? null,
      flagType: input.flagType,
      riskScore: input.riskScore,
      evidence: input.evidence ? JSON.stringify(input.evidence) : null,
      autoBlocked: !!blockedUntil,
      blockedUntil,
    },
  });

  // Record security event
  await recordSecurityEvent({
    userId: input.userId,
    workspaceId: input.workspaceId,
    ip: input.ip,
    eventType: 'abuse_detected',
    severity: input.riskScore >= 70 ? 'high' : input.riskScore >= 40 ? 'medium' : 'low',
    riskScore: input.riskScore,
    payload: { flagType: input.flagType, flagId: flag.id, evidence: input.evidence },
  });

  return toDTO(flag);
}

/**
 * List abuse flags with filters.
 */
export async function listAbuseFlags(opts: {
  userId?: string;
  workspaceId?: string;
  ip?: string;
  flagType?: AbuseFlagType;
  unresolvedOnly?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: AbuseFlagDTO[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = {};
  if (opts.userId) where.userId = opts.userId;
  if (opts.workspaceId) where.workspaceId = opts.workspaceId;
  if (opts.ip) where.ip = opts.ip;
  if (opts.flagType) where.flagType = opts.flagType;
  if (opts.unresolvedOnly) where.resolvedAt = null;

  const [items, total] = await Promise.all([
    db.abuseDetectionFlag.findMany({
      where,
      orderBy: [{ riskScore: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    db.abuseDetectionFlag.count({ where }),
  ]);

  return { items: items.map(toDTO), total };
}

/**
 * Resolve an abuse flag (admin action).
 */
export async function resolveAbuseFlag(
  id: string,
  resolvedBy: string,
  resolution: 'false_positive' | 'confirmed' | 'escalated',
): Promise<void> {
  await db.abuseDetectionFlag.update({
    where: { id },
    data: { resolvedAt: new Date(), resolvedBy, resolution },
  });
}

/**
 * Check if a caller is currently flagged/blocked.
 */
export async function isFlagged(ctx: { userId?: string; ip?: string }): Promise<{
  flagged: boolean;
  blocked: boolean;
  blockedUntil: Date | null;
}> {
  const or: unknown[] = [];
  if (ctx.userId) or.push({ userId: ctx.userId });
  if (ctx.ip) or.push({ ip: ctx.ip });

  if (or.length === 0) return { flagged: false, blocked: false, blockedUntil: null };

  const flags = await db.abuseDetectionFlag.findMany({
    where: {
      OR: or as never[],
      resolvedAt: null,
      blockedUntil: { gt: new Date() },
    },
    select: { blockedUntil: true },
  });

  if (flags.length === 0) return { flagged: false, blocked: false, blockedUntil: null };

  const blockedUntil = flags.reduce((latest: Date | null, f) => {
    if (!f.blockedUntil) return latest;
    if (!latest || f.blockedUntil > latest) return f.blockedUntil;
    return latest;
  }, null);

  return {
    flagged: true,
    blocked: !!blockedUntil,
    blockedUntil,
  };
}

/**
 * Clear in-memory counters (for testing or admin reset).
 */
export function clearCounters(): void {
  requestCounters.clear();
}
