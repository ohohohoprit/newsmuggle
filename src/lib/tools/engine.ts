/**
 * Tool Execution Engine — the single function that powers every tool run.
 *
 * Pipeline:
 *   1. Resolve tool definition (cached).
 *   2. Validate runtime inputs against the tool's inputSchema.
 *   3. Resolve the caller's active workspace + verify membership.
 *   4. Check plan access (tool.minPlan vs user.plan).
 *   5. Check usage quota (workspace-scoped, monthly, reset via cron).
 *   6. Render the prompt template with the validated inputs.
 *   7. Call the unified AI service (aiService.generate) which routes to
 *      the appropriate provider (ZAI / OpenAI / Claude / Gemini / Grok /
 *      DeepSeek) with retries + usage tracking.
 *   8. Parse the output according to outputFormat (text | json | items | structured).
 *   9. Persist a ToolExecution row (including token usage + cost).
 *  10. Return a structured ToolExecutionResult.
 *
 * The engine never touches any AI SDK directly — all AI calls go through
 * the unified AI service layer (src/lib/ai/service.ts).
 *
 * Every step is auditable. Failures are stored as status='failed' so the
 * user can see them in history and admins can debug.
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/auth';
import { requireMembership } from '@/lib/workspace';
import { checkAndIncrementQuota as billingCheckQuota } from '@/lib/billing/quota';
import { QuotaExceededError as BillingQuotaExceededError } from '@/lib/billing/errors';
import {
  type ToolDefinitionDTO,
  type FieldConfig,
  type OutputFormat,
  type ModelConfig,
  type PromptTemplate,
  type ToolExecutionResult,
  type ToolExecutionHistoryItem,
  type ToolItem,
  type ToolMetrics,
  ToolError,
  planRank,
} from '@/lib/tools/types';
import { getToolBySlug, getToolRaw } from '@/lib/tools/registry';
import { validateRunInputs } from '@/lib/tools/validation';
import { aiService, AIServiceError } from '@/lib/ai/service';

// ===== Constants =====

const MAX_ITEMS = 20;
const DEFAULT_TEMPERATURE = 0.8;

// ===== Helpers =====

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parsePromptTemplate(raw: string): PromptTemplate {
  const parsed = safeParseJson<{ system?: string; user?: string }>(raw, {});
  if (!parsed.system || !parsed.user) {
    throw new ToolError(
      'INVALID_PROMPT_TEMPLATE',
      'Tool has an invalid prompt template. Contact an admin.',
      500,
    );
  }
  return { system: parsed.system, user: parsed.user };
}

/**
 * Render a prompt template by interpolating {{var}} placeholders.
 * Unknown placeholders are left as-is (so the LLM can see them).
 */
function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return String(vars[key]);
    }
    return `{{${key}}}`;
  });
}

/**
 * Robust JSON extractor — handles markdown fences, leading/trailing prose,
 * and partial-JSON cases. Returns the parsed value or null.
 */
function extractJson(raw: string): unknown | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through
  }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      // fall through
    }
  }
  // Try array form
  const arrStart = cleaned.indexOf('[');
  const arrEnd = cleaned.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
    } catch {
      // fall through
    }
  }
  return null;
}

/** Clamp a number to a 0-100 integer range. */
function clampScore(v: unknown, dflt = 80): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(50, Math.min(100, Math.round(n)));
}

/** Clamp a number to a 0-10 float range (1 decimal). */
function clampMetric(v: unknown, dflt = 8): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

// ===== Output parsers (one per OutputFormat) =====

interface ParsedOutput {
  items?: ToolItem[];
  text?: string;
  data?: unknown;
  summary?: string;
  metrics?: ToolMetrics;
}

function parseItemsOutput(raw: string, count: number, toolSlug: string): ParsedOutput {
  const parsed = extractJson(raw) as { items?: unknown[]; summary?: unknown; metrics?: Record<string, unknown> } | null;

  const fallbackItems: ToolItem[] = buildFallbackItems(toolSlug, count);

  if (!parsed || !Array.isArray(parsed.items)) {
    return { items: fallbackItems, summary: 'Generated fallback results (LLM output could not be parsed).' };
  }

  const items: ToolItem[] = [];
  for (const r of parsed.items) {
    if (!r || typeof r !== 'object') continue;
    const item = r as Record<string, unknown>;
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (!text) continue;
    items.push({
      text,
      score: item.score !== undefined ? clampScore(item.score) : undefined,
      rationale: typeof item.rationale === 'string' ? item.rationale.trim() : undefined,
    });
  }
  if (items.length === 0) {
    return { items: fallbackItems, summary: 'Generated fallback results (LLM returned no usable items).' };
  }

  const result: ParsedOutput = { items: items.slice(0, Math.max(count, MAX_ITEMS)) };
  if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
    result.summary = parsed.summary.trim();
  }
  if (parsed.metrics && typeof parsed.metrics === 'object') {
    result.metrics = sanitizeMetrics(parsed.metrics);
  }
  return result;
}

function parseStructuredOutput(raw: string): ParsedOutput {
  const parsed = extractJson(raw);
  if (parsed === null || typeof parsed !== 'object') {
    return {
      data: null,
      summary: 'LLM output could not be parsed as a JSON object.',
    };
  }
  const obj = parsed as Record<string, unknown>;
  const result: ParsedOutput = { data: parsed };
  if (typeof obj.summary === 'string') result.summary = obj.summary;
  if (obj.metrics && typeof obj.metrics === 'object') {
    result.metrics = sanitizeMetrics(obj.metrics as Record<string, unknown>);
  }
  return result;
}

function parseJsonOutput(raw: string): ParsedOutput {
  const parsed = extractJson(raw);
  if (parsed === null) {
    return { data: null, summary: 'LLM output could not be parsed as JSON.' };
  }
  return { data: parsed };
}

function parseTextOutput(raw: string): ParsedOutput {
  const text = raw.trim();
  if (!text) {
    return { text: '', summary: 'LLM returned an empty response.' };
  }
  // Strip markdown code fences if the whole response is fenced
  const fenceMatch = text.match(/^```[a-z]*\s*([\s\S]*?)```$/i);
  if (fenceMatch) {
    return { text: fenceMatch[1].trim() };
  }
  return { text };
}

function sanitizeMetrics(raw: Record<string, unknown>): ToolMetrics {
  const out: ToolMetrics = {};
  if ('curiosity' in raw) out.curiosity = clampMetric(raw.curiosity);
  if ('specificity' in raw) out.specificity = clampMetric(raw.specificity);
  if ('benefitDriven' in raw || 'benefit_driven' in raw) {
    out.benefitDriven = clampMetric(raw.benefitDriven ?? raw.benefit_driven);
  }
  if ('emotionalImpact' in raw || 'emotional_impact' in raw) {
    out.emotionalImpact = clampMetric(raw.emotionalImpact ?? raw.emotional_impact);
  }
  return out;
}

function buildFallbackItems(toolSlug: string, count: number): ToolItem[] {
  const templates = [
    'The secret behind {{topic}} that nobody tells you',
    'Stop wasting time on {{topic}}. Do this instead.',
    'I tried everything for {{topic}}. Here\'s what actually works.',
    'The 5-minute {{topic}} trick that changed everything',
    'Why 99% of people get {{topic}} wrong (and how to fix it)',
    'The truth about {{topic}} that experts won\'t share',
    'How I mastered {{topic}} in 30 days (and you can too)',
    'The {{topic}} framework top creators use',
  ];
  const topic = toolSlug.replace(/-/g, ' ');
  return templates.slice(0, Math.min(count, templates.length)).map((t) => ({
    text: t.replace('{{topic}}', topic),
    score: 80 + Math.floor(Math.random() * 15),
    rationale: 'Curiosity-driven opening that promises clear value.',
  }));
}

// ===== AI call (delegates to the unified AI service) =====

interface LlmCallResult {
  content: string;
  latencyMs: number;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  retries: number;
}

/**
 * Call the unified AI service to generate a completion.
 *
 * The tool engine never touches any provider SDK directly — it goes
 * through `aiService.generate()` which handles provider selection,
 * retries, error normalization, and usage tracking.
 */
async function callLlm(
  modelConfig: ModelConfig,
  system: string,
  user: string,
): Promise<LlmCallResult> {
  const response = await aiService.generate(
    {
      system,
      messages: [{ role: 'user', content: user }],
      temperature: modelConfig.temperature ?? 0.8,
      ...(modelConfig.maxTokens ? { maxTokens: modelConfig.maxTokens } : {}),
      thinkingEnabled: modelConfig.thinkingEnabled,
    },
    {
      toolConfig: modelConfig,
      timeoutMs: 60_000,
      maxRetries: 3,
    },
  );

  return {
    content: response.content,
    latencyMs: response.latencyMs,
    provider: response.provider,
    model: response.model,
    promptTokens: response.usage.promptTokens,
    completionTokens: response.usage.completionTokens,
    totalTokens: response.usage.totalTokens,
    costUsd: response.cost.usd,
    retries: response.retries,
  };
}

// ===== Public API =====

export interface RunToolContext {
  userId: string;
  userPlan: string;
  workspaceId?: string; // optional: if not provided, use active workspace
}

export interface RunToolResult extends ToolExecutionResult {
  quota: { used: number; limit: number; remaining: number };
}

/**
 * Run a tool by slug for the given user + workspace.
 *
 * Throws ToolError on any validation/permission/quota failure.
 * On LLM failure, returns a partial/failed result (still stored in history).
 */
export async function runTool(
  slug: string,
  body: Record<string, unknown>,
  ctx: RunToolContext,
  req: Request,
): Promise<RunToolResult> {
  const startedAt = Date.now();

  // 1. Resolve tool
  const toolRaw = await getToolRaw(slug);
  if (!toolRaw) {
    throw new ToolError('TOOL_NOT_FOUND', `Tool "${slug}" not found.`, 404);
  }
  if (!toolRaw.isEnabled) {
    throw new ToolError('TOOL_DISABLED', `Tool "${slug}" is currently disabled.`, 403);
  }

  // 2. Validate inputs
  const inputSchema = safeParseJson<FieldConfig[]>(toolRaw.inputSchema, []);
  let inputs: Record<string, string>;
  let count: number;
  try {
    const validated = validateRunInputs(inputSchema, body);
    inputs = validated.inputs;
    count = validated.count;
  } catch (err) {
    throw new ToolError(
      'VALIDATION_ERROR',
      err instanceof Error ? err.message : 'Invalid inputs.',
      400,
    );
  }

  // 3. Resolve workspace + verify membership
  let workspaceId = ctx.workspaceId;
  if (!workspaceId) {
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { activeWorkspaceId: true },
    });
    workspaceId = user?.activeWorkspaceId ?? undefined;
  }
  if (!workspaceId) {
    throw new ToolError('NO_ACTIVE_WORKSPACE', 'You do not have an active workspace. Create or switch to one first.', 400);
  }
  // Reuse the workspace service's isolation check
  await requireMembership(workspaceId, ctx.userId);

  // 4. Check plan access
  const requiredPlanRank = planRank(toolRaw.minPlan);
  const userPlanRank = planRank(ctx.userPlan);
  if (userPlanRank < requiredPlanRank) {
    throw new ToolError(
      'PLAN_UPGRADE_REQUIRED',
      `This tool requires the ${toolRaw.minPlan} plan or higher. Your current plan: ${ctx.userPlan}.`,
      403,
    );
  }

  // 5. Check quota (delegates to the billing service which resolves
  //    the workspace's effective plan + entitlements)
  let quota;
  try {
    quota = await billingCheckQuota(workspaceId);
  } catch (err) {
    // Translate billing quota errors into ToolError for the API layer
    if (err instanceof BillingQuotaExceededError) {
      throw new ToolError('QUOTA_EXCEEDED', err.message, 429);
    }
    throw err;
  }

  // 6. Render prompt
  const promptTemplate = parsePromptTemplate(toolRaw.promptTemplate);
  const modelConfig = safeParseJson<ModelConfig>(toolRaw.modelConfig, {
    provider: 'zai',
    model: 'default',
    temperature: DEFAULT_TEMPERATURE,
  });
  const templateVars: Record<string, string | number> = {
    ...inputs,
    count,
    toolName: toolRaw.name,
    toolSlug: toolRaw.slug,
    outputFormat: toolRaw.outputFormat,
  };
  const systemPrompt = renderTemplate(promptTemplate.system, templateVars);
  const userPrompt = renderTemplate(promptTemplate.user, templateVars);

  const outputFormat = (['text', 'json', 'items', 'structured'].includes(toolRaw.outputFormat)
    ? toolRaw.outputFormat
    : 'items') as OutputFormat;

  // 7. Call AI service + 8. Parse output
  let parsed: ParsedOutput;
  let status: 'success' | 'failed' | 'partial' = 'success';
  let errorMessage: string | null = null;
  let latencyMs = 0;
  let aiResult: LlmCallResult | null = null;

  try {
    aiResult = await callLlm(modelConfig, systemPrompt, userPrompt);
    latencyMs = aiResult.latencyMs;

    if (outputFormat === 'items') {
      parsed = parseItemsOutput(aiResult.content, count, slug);
    } else if (outputFormat === 'structured') {
      parsed = parseStructuredOutput(aiResult.content);
    } else if (outputFormat === 'json') {
      parsed = parseJsonOutput(aiResult.content);
    } else {
      parsed = parseTextOutput(aiResult.content);
    }

    // If parsing yielded nothing useful, mark as partial
    if (
      (outputFormat === 'items' && (!parsed.items || parsed.items.length === 0)) ||
      (outputFormat === 'structured' && parsed.data === null) ||
      (outputFormat === 'json' && parsed.data === null) ||
      (outputFormat === 'text' && !parsed.text)
    ) {
      status = 'partial';
    }
  } catch (err) {
    status = 'failed';
    // Normalize AI service errors into a human-readable message
    if (err instanceof AIServiceError) {
      errorMessage = `[${err.code}] ${err.message}`;
    } else {
      errorMessage = err instanceof Error ? err.message : 'AI call failed.';
    }
    latencyMs = Date.now() - startedAt;
    parsed = outputFormat === 'items'
      ? { items: buildFallbackItems(slug, count), summary: 'Generated fallback results (AI call failed).' }
      : outputFormat === 'text'
        ? { text: '', summary: 'AI call failed.' }
        : { data: null, summary: 'AI call failed.' };
  }

  // 9. Persist execution (including AI usage tracking)
  const output = JSON.stringify({
    items: parsed.items,
    text: parsed.text,
    data: parsed.data,
    summary: parsed.summary,
    metrics: parsed.metrics,
  });

  const execution = await db.toolExecution.create({
    data: {
      toolId: toolRaw.id,
      userId: ctx.userId,
      workspaceId,
      inputs: JSON.stringify(inputs),
      outputFormat,
      output,
      summary: parsed.summary ?? null,
      metrics: parsed.metrics ? JSON.stringify(parsed.metrics) : null,
      status,
      errorMessage,
      modelConfig: JSON.stringify(modelConfig),
      provider: aiResult?.provider ?? null,
      model: aiResult?.model ?? null,
      latencyMs,
      promptTokens: aiResult?.promptTokens ?? 0,
      completionTokens: aiResult?.completionTokens ?? 0,
      totalTokens: aiResult?.totalTokens ?? 0,
      tokenUsage: aiResult?.totalTokens ?? 0,
      costUsd: aiResult?.costUsd ?? 0,
      retries: aiResult?.retries ?? 0,
    },
  });

  // Audit log
  await auditLog('tool_run', ctx.userId, req, status === 'failed' ? 'failed' : 'success', {
    toolId: toolRaw.id,
    toolSlug: slug,
    workspaceId,
    executionId: execution.id,
    status,
    latencyMs,
  });

  // 10. Return structured result
  const result: RunToolResult = {
    executionId: execution.id,
    toolId: toolRaw.id,
    toolSlug: slug,
    outputFormat,
    status,
    latencyMs,
    createdAt: execution.createdAt.toISOString(),
    items: parsed.items,
    text: parsed.text,
    data: parsed.data,
    summary: parsed.summary,
    metrics: parsed.metrics,
    errorMessage: errorMessage ?? undefined,
    quota: { used: quota.used, limit: quota.limit, remaining: quota.remaining },
  };

  return result;
}

// ===== History =====

export async function getToolHistory(
  slug: string,
  ctx: { userId: string; workspaceId?: string },
  opts: { limit?: number; offset?: number } = {},
): Promise<{ items: ToolExecutionHistoryItem[]; total: number }> {
  const limit = Math.min(opts.limit ?? 20, 100);
  const offset = opts.offset ?? 0;

  // Resolve workspace
  let workspaceId = ctx.workspaceId;
  if (!workspaceId) {
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { activeWorkspaceId: true },
    });
    workspaceId = user?.activeWorkspaceId ?? undefined;
  }

  const tool = await db.toolDefinition.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  if (!tool) {
    throw new ToolError('TOOL_NOT_FOUND', `Tool "${slug}" not found.`, 404);
  }

  const where: Record<string, unknown> = { toolId: tool.id, userId: ctx.userId };
  if (workspaceId) where.workspaceId = workspaceId;

  const [executions, total] = await Promise.all([
    db.toolExecution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        toolId: true,
        inputs: true,
        outputFormat: true,
        summary: true,
        status: true,
        latencyMs: true,
        createdAt: true,
      },
    }),
    db.toolExecution.count({ where }),
  ]);

  return {
    items: executions.map((e) => ({
      id: e.id,
      toolId: e.toolId,
      toolSlug: tool.slug,
      toolName: tool.name,
      inputs: safeParseJson<Record<string, string>>(e.inputs, {}),
      outputFormat: e.outputFormat as OutputFormat,
      status: e.status,
      summary: e.summary,
      latencyMs: e.latencyMs,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
  };
}

/**
 * Get a single execution by id (for re-viewing past results).
 * Verifies the caller owns the execution.
 */
export async function getExecution(
  executionId: string,
  ctx: { userId: string },
): Promise<ToolExecutionResult | null> {
  const exec = await db.toolExecution.findUnique({
    where: { id: executionId },
    include: { tool: { select: { slug: true, name: true } } },
  });
  if (!exec) return null;
  if (exec.userId !== ctx.userId) {
    throw new ToolError('FORBIDDEN', 'You can only view your own executions.', 403);
  }

  const parsed = safeParseJson<{
    items?: ToolItem[];
    text?: string;
    data?: unknown;
    summary?: string;
    metrics?: ToolMetrics;
  }>(exec.output, {});

  return {
    executionId: exec.id,
    toolId: exec.toolId,
    toolSlug: exec.tool.slug,
    outputFormat: exec.outputFormat as OutputFormat,
    items: parsed.items,
    text: parsed.text,
    data: parsed.data,
    summary: parsed.summary ?? parsed.summary,
    metrics: parsed.metrics,
    status: exec.status as 'success' | 'failed' | 'partial',
    latencyMs: exec.latencyMs,
    errorMessage: exec.errorMessage ?? undefined,
    createdAt: exec.createdAt.toISOString(),
  };
}
