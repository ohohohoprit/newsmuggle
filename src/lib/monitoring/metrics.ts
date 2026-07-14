/**
 * Metrics service — aggregates request latency, error counts, job stats,
 * AI usage, security events, and cache stats for admin dashboards.
 *
 * In-memory counters are used for real-time stats. Periodic snapshots
 * can be persisted to MetricSnapshot via a cron job (future).
 */
import { db } from '@/lib/db';
import type { MetricsSummary } from '@/lib/monitoring/types';
import { getRateLimitStats } from '@/lib/security/rate-limit';
import { getStats as getCacheStats } from '@/lib/cache/service';
import { getSecurityStats } from '@/lib/security/events';

// ===== In-memory request counters =====

interface RequestMetric {
  count: number;
  totalLatencyMs: number;
  latencies: number[];
  errorCount: number;
  windowStart: number;
}

const requestMetrics = new Map<string, RequestMetric>();
const METRIC_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getRequestMetric(route: string): RequestMetric {
  let metric = requestMetrics.get(route);
  if (!metric) {
    metric = { count: 0, totalLatencyMs: 0, latencies: [], errorCount: 0, windowStart: Date.now() };
    requestMetrics.set(route, metric);
  }
  // Reset window if expired
  if (Date.now() - metric.windowStart > METRIC_WINDOW_MS) {
    metric.count = 0;
    metric.totalLatencyMs = 0;
    metric.latencies = [];
    metric.errorCount = 0;
    metric.windowStart = Date.now();
  }
  return metric;
}

/**
 * Record a request metric. Called by middleware after each request.
 */
export function recordRequestMetric(route: string, latencyMs: number, isError: boolean): void {
  const metric = getRequestMetric(route);
  metric.count++;
  metric.totalLatencyMs += latencyMs;
  metric.latencies.push(latencyMs);
  // Keep only last 1000 latencies to bound memory
  if (metric.latencies.length > 1000) {
    metric.latencies = metric.latencies.slice(-1000);
  }
  if (isError) metric.errorCount++;
}

/**
 * Compute percentile from an array of values.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))] ?? 0;
}

// ===== Public API =====

/**
 * Get aggregated metrics summary for the admin dashboard.
 */
export async function getMetricsSummary(): Promise<MetricsSummary> {
  // Aggregate in-memory request metrics
  let totalApiCalls = 0;
  let totalLatency = 0;
  let totalErrors = 0;
  const allLatencies: number[] = [];

  for (const metric of requestMetrics.values()) {
    totalApiCalls += metric.count;
    totalLatency += metric.totalLatencyMs;
    totalErrors += metric.errorCount;
    allLatencies.push(...metric.latencies);
  }

  allLatencies.sort((a, b) => a - b);
  const avgLatency = totalApiCalls > 0 ? totalLatency / totalApiCalls : 0;
  const p95Latency = percentile(allLatencies, 0.95);

  // Job stats from DB (last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totalJobRuns, failedJobRuns] = await Promise.all([
    db.jobRun.count({ where: { createdAt: { gte: since } } }),
    db.jobRun.count({ where: { createdAt: { gte: since }, status: 'failed' } }),
  ]);

  // AI stats from DB (last 24h)
  const aiStats = await db.toolExecution.aggregate({
    where: { createdAt: { gte: since }, status: 'success' },
    _sum: { totalTokens: true, costUsd: true, latencyMs: true },
    _count: true,
  });

  // Security stats
  const securityStats = await getSecurityStats({ since });

  // Cache stats
  const cacheStats = getCacheStats();

  // Rate limit stats
  const rateLimitStats = getRateLimitStats();

  return {
    timestamp: new Date().toISOString(),
    period: 'last_24h',
    apiCalls: {
      total: totalApiCalls,
      avgLatencyMs: Math.round(avgLatency),
      p95LatencyMs: Math.round(p95Latency),
      errorRate: totalApiCalls > 0 ? (totalErrors / totalApiCalls) * 100 : 0,
    },
    jobs: {
      totalRuns: totalJobRuns,
      successRate: totalJobRuns > 0 ? ((totalJobRuns - failedJobRuns) / totalJobRuns) * 100 : 100,
      failedRuns: failedJobRuns,
    },
    ai: {
      totalExecutions: aiStats._count,
      totalTokens: aiStats._sum.totalTokens ?? 0,
      totalCostUsd: aiStats._sum.costUsd ?? 0,
      avgLatencyMs: aiStats._count > 0 ? (aiStats._sum.latencyMs ?? 0) / aiStats._count : 0,
    },
    security: {
      totalEvents: securityStats.total,
      unresolvedEvents: securityStats.unresolved,
      blockedRequests: rateLimitStats.blockedCount,
    },
    cache: {
      totalEntries: cacheStats.totalEntries,
      totalHits: cacheStats.totalHits,
      totalSizeBytes: cacheStats.totalSizeBytes,
    },
    rateLimits: rateLimitStats,
  };
}

/**
 * Get request metrics by route (for debugging slow endpoints).
 */
export function getRequestMetricsByRoute(): Array<{
  route: string;
  count: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorCount: number;
  errorRate: number;
}> {
  const results: Array<{
    route: string;
    count: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorCount: number;
    errorRate: number;
  }> = [];

  for (const [route, metric] of requestMetrics.entries()) {
    const sorted = [...metric.latencies].sort((a, b) => a - b);
    results.push({
      route,
      count: metric.count,
      avgLatencyMs: metric.count > 0 ? metric.totalLatencyMs / metric.count : 0,
      p95LatencyMs: percentile(sorted, 0.95),
      errorCount: metric.errorCount,
      errorRate: metric.count > 0 ? (metric.errorCount / metric.count) * 100 : 0,
    });
  }

  return results.sort((a, b) => b.count - a.count);
}

/**
 * Clear in-memory metrics (for testing).
 */
export function clearMetrics(): void {
  requestMetrics.clear();
}
