/**
 * Security event recording — persists security-related events for
 * auditing, monitoring, and abuse detection.
 *
 * Called by:
 *   - rate-limit.ts (when rate limits are hit)
 *   - abuse.ts (when abuse patterns are detected)
 *   - middleware (when requests are blocked)
 *   - auth.ts (when auth failures burst)
 *   - any service that wants to record a security-relevant event
 */
import { db } from '@/lib/db';
import type { SecurityEventType, SecuritySeverity, SecurityEventDTO } from '@/lib/security/types';
import { SEVERITY_RANK } from '@/lib/security/types';

export interface RecordSecurityEventInput {
  userId?: string | null;
  workspaceId?: string | null;
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  ip?: string | null;
  userAgent?: string | null;
  path?: string | null;
  method?: string | null;
  riskScore?: number;
  payload?: Record<string, unknown> | null;
}

function toDTO(e: {
  id: string;
  userId: string | null;
  workspaceId: string | null;
  eventType: string;
  severity: string;
  ip: string | null;
  path: string | null;
  method: string | null;
  riskScore: number;
  resolvedAt: Date | null;
  createdAt: Date;
}): SecurityEventDTO {
  return {
    id: e.id,
    userId: e.userId,
    workspaceId: e.workspaceId,
    eventType: e.eventType as SecurityEventType,
    severity: e.severity as SecuritySeverity,
    ip: e.ip,
    path: e.path,
    method: e.method,
    riskScore: e.riskScore,
    resolvedAt: e.resolvedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

/**
 * Record a security event. Non-blocking — never fails the caller.
 */
export async function recordSecurityEvent(input: RecordSecurityEventInput): Promise<string | null> {
  try {
    const event = await db.securityEvent.create({
      data: {
        userId: input.userId ?? null,
        workspaceId: input.workspaceId ?? null,
        eventType: input.eventType,
        severity: input.severity ?? 'low',
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        path: input.path ?? null,
        method: input.method ?? null,
        riskScore: input.riskScore ?? 0,
        payload: input.payload ? JSON.stringify(input.payload) : null,
      },
    });
    return event.id;
  } catch (err) {
    console.error('[security/events] failed to record:', err);
    return null;
  }
}

/**
 * List security events with filters.
 */
export async function listSecurityEvents(opts: {
  userId?: string;
  workspaceId?: string;
  eventType?: SecurityEventType;
  severity?: SecuritySeverity;
  unresolvedOnly?: boolean;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: SecurityEventDTO[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = {};
  if (opts.userId) where.userId = opts.userId;
  if (opts.workspaceId) where.workspaceId = opts.workspaceId;
  if (opts.eventType) where.eventType = opts.eventType;
  if (opts.severity) where.severity = opts.severity;
  if (opts.unresolvedOnly) where.resolvedAt = null;
  if (opts.since || opts.until) {
    where.createdAt = {};
    if (opts.since) (where.createdAt as { gte?: Date }).gte = opts.since;
    if (opts.until) (where.createdAt as { lte?: Date }).lte = opts.until;
  }

  const [items, total] = await Promise.all([
    db.securityEvent.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    db.securityEvent.count({ where }),
  ]);

  return { items: items.map(toDTO), total };
}

/**
 * Resolve a security event (admin action).
 */
export async function resolveSecurityEvent(id: string, resolvedBy: string): Promise<void> {
  await db.securityEvent.update({
    where: { id },
    data: { resolvedAt: new Date(), resolvedBy },
  });
}

/**
 * Get security event stats for admin dashboard.
 */
export async function getSecurityStats(opts: { since?: Date } = {}): Promise<{
  total: number;
  unresolved: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
}> {
  const since = opts.since ?? new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
  const events = await db.securityEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { severity: true, eventType: true, resolvedAt: true },
  });

  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let unresolved = 0;

  for (const e of events) {
    bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
    byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
    if (!e.resolvedAt) unresolved++;
  }

  return { total: events.length, unresolved, bySeverity, byType };
}
