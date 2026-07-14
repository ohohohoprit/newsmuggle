/**
 * Audit log query service — read + filter audit logs for admin dashboards.
 *
 * Every query is itself logged in AuditQueryLog for accountability.
 */
import { db } from '@/lib/db';
import type { AuditLogDTO } from '@/lib/monitoring/types';

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toDTO(a: {
  id: string;
  userId: string | null;
  action: string;
  ip: string | null;
  userAgent: string | null;
  status: string;
  meta: string | null;
  createdAt: Date;
}): AuditLogDTO {
  return {
    id: a.id,
    userId: a.userId,
    action: a.action,
    ip: a.ip,
    userAgent: a.userAgent,
    status: a.status,
    meta: safeParseJson<Record<string, unknown> | null>(a.meta, null),
    createdAt: a.createdAt.toISOString(),
  };
}

export async function queryAuditLogs(
  opts: {
    userId?: string;
    action?: string;
    status?: string;
    since?: Date;
    until?: Date;
    limit?: number;
    offset?: number;
  } = {},
  queriedBy?: { userId: string; ip?: string },
): Promise<{ items: AuditLogDTO[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = {};
  if (opts.userId) where.userId = opts.userId;
  if (opts.action) where.action = opts.action;
  if (opts.status) where.status = opts.status;
  if (opts.since || opts.until) {
    where.createdAt = {};
    if (opts.since) (where.createdAt as { gte?: Date }).gte = opts.since;
    if (opts.until) (where.createdAt as { lte?: Date }).lte = opts.until;
  }

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    db.auditLog.count({ where }),
  ]);

  // Log the query itself for accountability
  if (queriedBy) {
    await db.auditQueryLog.create({
      data: {
        queriedById: queriedBy.userId,
        queryFilters: JSON.stringify(opts),
        resultCount: total,
        ipAddress: queriedBy.ip ?? null,
      },
    }).catch(() => {});
  }

  return { items: items.map(toDTO), total };
}

export async function getAuditStats(opts: { since?: Date } = {}): Promise<{
  total: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
}> {
  const since = opts.since ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
  const logs = await db.auditLog.findMany({
    where: { createdAt: { gte: since } },
    select: { action: true, status: true },
  });

  const byAction: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const l of logs) {
    byAction[l.action] = (byAction[l.action] ?? 0) + 1;
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
  }

  return { total: logs.length, byAction, byStatus };
}
