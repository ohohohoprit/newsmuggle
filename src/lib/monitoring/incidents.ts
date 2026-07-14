/**
 * Service incidents — create, list, resolve incidents for the admin
 * monitoring dashboard.
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/auth';
import type { ServiceIncidentDTO } from '@/lib/monitoring/types';

function toDTO(i: {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  serviceName: string | null;
  startedAt: Date;
  resolvedAt: Date | null;
  affectedUsers: number;
  createdById: string | null;
  resolvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ServiceIncidentDTO {
  return {
    id: i.id,
    title: i.title,
    description: i.description,
    severity: i.severity,
    status: i.status,
    serviceName: i.serviceName,
    startedAt: i.startedAt.toISOString(),
    resolvedAt: i.resolvedAt?.toISOString() ?? null,
    affectedUsers: i.affectedUsers,
    createdById: i.createdById,
    resolvedById: i.resolvedById,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

export async function createIncident(
  input: {
    title: string;
    description?: string;
    severity?: string;
    serviceName?: string;
    affectedUsers?: number;
    metadata?: Record<string, unknown>;
  },
  userId: string,
  req?: Request,
): Promise<ServiceIncidentDTO> {
  const incident = await db.serviceIncident.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      severity: input.severity ?? 'warning',
      status: 'open',
      serviceName: input.serviceName ?? null,
      affectedUsers: input.affectedUsers ?? 0,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      createdById: userId,
    },
  });

  if (req) {
    await auditLog('incident_create', userId, req, 'success', {
      incidentId: incident.id,
      title: incident.title,
      severity: incident.severity,
    });
  }

  return toDTO(incident);
}

export async function resolveIncident(
  id: string,
  userId: string,
  req?: Request,
): Promise<ServiceIncidentDTO> {
  const incident = await db.serviceIncident.update({
    where: { id },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedById: userId,
    },
  });

  if (req) {
    await auditLog('incident_resolve', userId, req, 'success', { incidentId: id });
  }

  return toDTO(incident);
}

export async function listIncidents(opts: {
  status?: string;
  severity?: string;
  serviceName?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: ServiceIncidentDTO[]; total: number }> {
  const limit = Math.min(opts.limit ?? 20, 100);
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;
  if (opts.severity) where.severity = opts.severity;
  if (opts.serviceName) where.serviceName = opts.serviceName;

  const [items, total] = await Promise.all([
    db.serviceIncident.findMany({
      where,
      orderBy: [{ startedAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    db.serviceIncident.count({ where }),
  ]);

  return { items: items.map(toDTO), total };
}

export async function getIncident(id: string): Promise<ServiceIncidentDTO | null> {
  const incident = await db.serviceIncident.findUnique({ where: { id } });
  return incident ? toDTO(incident) : null;
}
