/**
 * AI metrics — usage tracking and cost calculation.
 *
 * The AI service calls `recordUsage()` after each generation. The data
 * is persisted in the ToolExecution table (provider, model, promptTokens,
 * completionTokens, totalTokens, costUsd, latencyMs, retries).
 *
 * This module also provides aggregate query helpers for admin dashboards.
 */
import { db } from '@/lib/db';
import type { AIProviderSlug } from '@/lib/ai/types';
import type { AIUsage, AICost, AIModelInfo } from '@/lib/ai/types';

// ===== Cost calculation =====

/**
 * Calculate the cost of a generation based on token usage and model pricing.
 * Returns 0 if the model is unknown (free tier / internal).
 */
export function calculateCost(usage: AIUsage, model: AIModelInfo): AICost {
  const promptPer1k = model.promptCostPer1k;
  const completionPer1k = model.completionCostPer1k;
  const usd =
    (usage.promptTokens / 1000) * promptPer1k +
    (usage.completionTokens / 1000) * completionPer1k;
  return {
    usd: Math.round(usd * 1_000_000) / 1_000_000, // 6 decimal places
    promptPer1k,
    completionPer1k,
  };
}

/**
 * Estimate token usage when the provider doesn't return it.
 * Uses a rough heuristic: ~4 chars per token for English text.
 */
export function estimateUsage(messages: { role: string; content: string }[], completion: string): AIUsage {
  const promptText = messages.map((m) => m.content).join('');
  const promptTokens = Math.ceil(promptText.length / 4);
  const completionTokens = Math.ceil(completion.length / 4);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

// ===== Persistence =====

export interface AIUsageRecord {
  executionId: string;
  provider: AIProviderSlug;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  retries: number;
  status: 'success' | 'failed' | 'partial';
}

/**
 * Persist usage data into the ToolExecution row.
 * Called by the AI service after each generation (success or failure).
 */
export async function recordUsage(record: AIUsageRecord): Promise<void> {
  try {
    await db.toolExecution.update({
      where: { id: record.executionId },
      data: {
        provider: record.provider,
        model: record.model,
        promptTokens: record.promptTokens,
        completionTokens: record.completionTokens,
        totalTokens: record.totalTokens,
        tokenUsage: record.totalTokens, // legacy alias
        costUsd: record.costUsd,
        latencyMs: record.latencyMs,
        retries: record.retries,
      },
    });
  } catch (err) {
    // Never fail the generation because of a metrics write error
    console.error('[ai/metrics] recordUsage failed:', err);
  }
}

// ===== Aggregate queries (for admin dashboards) =====

export interface AIUsageSummary {
  totalExecutions: number;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  byProvider: Record<string, { count: number; tokens: number; costUsd: number }>;
}

/**
 * Get aggregated usage stats for a workspace (or globally if workspaceId omitted).
 */
export async function getUsageSummary(opts: {
  workspaceId?: string;
  since?: Date;
  until?: Date;
} = {}): Promise<AIUsageSummary> {
  const where: Record<string, unknown> = {};
  if (opts.workspaceId) where.workspaceId = opts.workspaceId;
  if (opts.since || opts.until) {
    where.createdAt = {};
    if (opts.since) (where.createdAt as { gte?: Date }).gte = opts.since;
    if (opts.until) (where.createdAt as { lte?: Date }).lte = opts.until;
  }

  const executions = await db.toolExecution.findMany({
    where,
    select: {
      provider: true,
      totalTokens: true,
      costUsd: true,
      latencyMs: true,
    },
  });

  const summary: AIUsageSummary = {
    totalExecutions: executions.length,
    totalTokens: 0,
    totalCostUsd: 0,
    avgLatencyMs: 0,
    byProvider: {},
  };

  let latencySum = 0;
  for (const e of executions) {
    const provider = (e.provider ?? 'unknown') as string;
    summary.totalTokens += e.totalTokens;
    summary.totalCostUsd += e.costUsd;
    latencySum += e.latencyMs;
    if (!summary.byProvider[provider]) {
      summary.byProvider[provider] = { count: 0, tokens: 0, costUsd: 0 };
    }
    summary.byProvider[provider].count += 1;
    summary.byProvider[provider].tokens += e.totalTokens;
    summary.byProvider[provider].costUsd += e.costUsd;
  }

  summary.avgLatencyMs = executions.length > 0 ? Math.round(latencySum / executions.length) : 0;
  summary.totalCostUsd = Math.round(summary.totalCostUsd * 1_000_000) / 1_000_000;

  return summary;
}
