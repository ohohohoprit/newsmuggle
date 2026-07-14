/**
 * Health check service — liveness + readiness + service status.
 *
 * /api/health (liveness): always returns 200 if the process is up.
 *   Used by load balancers to know if the container is alive.
 *
 * /api/ready (readiness): checks if the app is ready to serve traffic.
 *   Checks DB connectivity + critical dependencies. Returns 503 if not ready.
 *
 * /api/admin/services/status: detailed service-by-service status for admins.
 */
import { db } from '@/lib/db';
import type { HealthCheckResult, HealthSummary, ReadinessResult, ServiceStatusDTO, ServiceName, HealthStatus } from '@/lib/monitoring/types';
import { getProviderInfos } from '@/lib/ai/providers';
import { getConfiguredProvider as getBillingProvider } from '@/lib/billing/providers';
import { getRateLimitStats } from '@/lib/security/rate-limit';
import { getStats as getCacheStats } from '@/lib/cache/service';

const START_TIME = Date.now();
const APP_VERSION = process.env.npm_package_version ?? '1.0.0';

// ===== Individual health checks =====

async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return {
      service: 'database',
      status: 'healthy',
      latencyMs: Date.now() - start,
      message: 'Database connection OK',
    };
  } catch (err) {
    return {
      service: 'database',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Database check failed',
    };
  }
}

async function checkAiProvider(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const providers = getProviderInfos();
    const available = providers.filter((p) => p.available);
    return {
      service: 'ai_provider',
      status: available.length > 0 ? 'healthy' : 'degraded',
      latencyMs: Date.now() - start,
      message: `${available.length}/${providers.length} AI providers available`,
      details: { providers: providers.map((p) => ({ slug: p.slug, available: p.available })) },
    };
  } catch (err) {
    return {
      service: 'ai_provider',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'AI provider check failed',
    };
  }
}

async function checkBilling(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const provider = getBillingProvider();
    return {
      service: 'billing',
      status: 'healthy',
      latencyMs: Date.now() - start,
      message: `Billing provider: ${provider.name} (${provider.isConfigured() ? 'configured' : 'not configured'})`,
      details: { provider: provider.slug, configured: provider.isConfigured() },
    };
  } catch (err) {
    return {
      service: 'billing',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Billing check failed',
    };
  }
}

async function checkStudio(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const accountCount = await db.connectedAccount.count({ where: { isConnected: true } });
    return {
      service: 'studio',
      status: 'healthy',
      latencyMs: Date.now() - start,
      message: `${accountCount} connected accounts`,
      details: { connectedAccounts: accountCount },
    };
  } catch (err) {
    return {
      service: 'studio',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Studio check failed',
    };
  }
}

async function checkNotifications(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const pendingDeliveries = await db.notificationDelivery.count({
      where: { status: 'pending', nextAttemptAt: { lte: new Date() } },
    });
    return {
      service: 'notifications',
      status: 'healthy',
      latencyMs: Date.now() - start,
      message: `${pendingDeliveries} pending deliveries`,
      details: { pendingDeliveries },
    };
  } catch (err) {
    return {
      service: 'notifications',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Notifications check failed',
    };
  }
}

async function checkJobs(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const runningJobs = await db.jobRun.count({ where: { status: 'running' } });
    const failedJobs = await db.jobRun.count({
      where: { status: 'failed', createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    return {
      service: 'jobs',
      status: failedJobs > 5 ? 'degraded' : 'healthy',
      latencyMs: Date.now() - start,
      message: `${runningJobs} running, ${failedJobs} failed (last hour)`,
      details: { runningJobs, failedJobs },
    };
  } catch (err) {
    return {
      service: 'jobs',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Jobs check failed',
    };
  }
}

async function checkCache(): Promise<HealthCheckResult> {
  const start = Date.now();
  const stats = getCacheStats();
  return {
    service: 'cache',
    status: 'healthy',
    latencyMs: Date.now() - start,
    message: `${stats.totalEntries} entries, ${stats.totalHits} hits`,
    details: stats,
  };
}

// ===== Aggregated checks =====

async function runAllChecks(): Promise<HealthCheckResult[]> {
  const [database, aiProvider, billing, studio, notifications, jobs, cache] = await Promise.all([
    checkDatabase(),
    checkAiProvider(),
    checkBilling(),
    checkStudio(),
    checkNotifications(),
    checkJobs(),
    checkCache(),
  ]);
  return [database, aiProvider, billing, studio, notifications, jobs, cache];
}

function aggregateStatus(checks: HealthCheckResult[]): HealthStatus {
  if (checks.some((c) => c.status === 'unhealthy')) return 'unhealthy';
  if (checks.some((c) => c.status === 'degraded')) return 'degraded';
  return 'healthy';
}

// ===== Public API =====

/**
 * Liveness check — is the process alive?
 * Always returns 200 if this function runs.
 */
export function getLiveness(): { status: 'alive'; uptime: number; timestamp: string } {
  return {
    status: 'alive',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Readiness check — is the app ready to serve traffic?
 * Checks DB + critical dependencies.
 */
export async function getReadiness(): Promise<ReadinessResult> {
  const checks = await runAllChecks();
  const criticalChecks = checks.filter((c) => ['database'].includes(c.service));
  const ready = criticalChecks.every((c) => c.status === 'healthy');

  return {
    ready,
    timestamp: new Date().toISOString(),
    checks,
    message: ready ? 'All critical services are ready' : 'Some critical services are not ready',
  };
}

/**
 * Full health summary — for /api/health endpoint.
 */
export async function getHealthSummary(): Promise<HealthSummary> {
  const checks = await runAllChecks();
  return {
    status: aggregateStatus(checks),
    timestamp: new Date().toISOString(),
    checks,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    version: APP_VERSION,
  };
}

/**
 * Service-by-service status for admin dashboard.
 */
export async function getServiceStatuses(): Promise<ServiceStatusDTO[]> {
  const checks = await runAllChecks();
  return checks.map((c) => ({
    service: c.service as ServiceName,
    status: c.status,
    lastCheckedAt: new Date().toISOString(),
    latencyMs: c.latencyMs,
    message: c.message ?? null,
    details: c.details ?? null,
  }));
}

/**
 * Get app uptime in seconds.
 */
export function getUptime(): number {
  return Math.floor((Date.now() - START_TIME) / 1000);
}
