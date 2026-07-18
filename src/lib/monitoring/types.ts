/**
 * Monitoring shared types.
 */

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type ServiceName =
  | 'database'
  | 'ai_provider'
  | 'billing'
  | 'studio'
  | 'notifications'
  | 'jobs'
  | 'cache'
  | 'global';

export const ALL_SERVICE_NAMES: ServiceName[] = [
  'database',
  'ai_provider',
  'billing',
  'studio',
  'notifications',
  'jobs',
  'cache',
  'global',
];

export interface HealthCheckResult {
  service: ServiceName;
  status: HealthStatus;
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthSummary {
  status: HealthStatus;
  timestamp: string;
  checks: HealthCheckResult[];
  uptime: number; // seconds
  version: string;
}

export interface ReadinessResult {
  ready: boolean;
  timestamp: string;
  checks: HealthCheckResult[];
  message: string;
}

export interface MetricSnapshotDTO {
  id: string;
  metricType: string;
  periodStart: string;
  periodEnd: string;
  period: string;
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  createdAt: string;
}

export interface ServiceIncidentDTO {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  serviceName: string | null;
  startedAt: string;
  resolvedAt: string | null;
  affectedUsers: number;
  createdById: string | null;
  resolvedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MetricsSummary {
  timestamp: string;
  period: string;
  apiCalls: {
    total: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorRate: number;
  };
  jobs: {
    totalRuns: number;
    successRate: number;
    failedRuns: number;
  };
  ai: {
    totalExecutions: number;
    totalTokens: number;
    totalCostUsd: number;
    avgLatencyMs: number;
  };
  security: {
    totalEvents: number;
    unresolvedEvents: number;
    blockedRequests: number;
  };
  cache: {
    totalEntries: number;
    totalHits: number;
    totalSizeBytes: number;
  };
  rateLimits: {
    totalBuckets: number;
    blockedCount: number;
  };
}

export interface ServiceStatusDTO {
  service: ServiceName;
  status: HealthStatus;
  lastCheckedAt: string;
  latencyMs: number;
  message: string | null;
  details: Record<string, unknown> | null;
}

export interface AuditLogDTO {
  id: string;
  userId: string | null;
  action: string;
  ip: string | null;
  userAgent: string | null;
  status: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}
