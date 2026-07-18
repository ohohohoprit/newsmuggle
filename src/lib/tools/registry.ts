/**
 * Tool Registry — DB-backed lookup with a small in-memory cache.
 *
 * The registry is the single source of truth for tool definitions.
 * Route handlers and the engine both call these functions; they never
 * touch Prisma directly for tool definitions.
 *
 * Cache strategy:
 *  - Categories cached for the process lifetime (they rarely change).
 *  - Tool definitions cached per-slug with a 60s TTL. Invalidated on
 *    admin create/update/delete.
 */
import { db } from '@/lib/db';
import {
  type ToolDefinitionDTO,
  type FieldConfig,
  type OutputFormat,
  type OutputSchema,
  type ModelConfig,
  type Plan,
  type ToolExample,
  ToolError,
} from '@/lib/tools/types';

// ===== Cache =====

const CACHE_TTL_MS = 60 * 1000; // 60s
const categoryCache = new Map<string, { id: string; slug: string; name: string }>();
let categoryCacheTime = 0;
const toolCache = new Map<string, { dto: ToolDefinitionDTO; expiresAt: number }>();
const toolListCache = { dtos: null as ToolDefinitionDTO[] | null, expiresAt: 0 };

function invalidateToolCache(slug?: string) {
  if (slug) {
    toolCache.delete(slug);
  } else {
    toolCache.clear();
  }
  toolListCache.dtos = null;
  toolListCache.expiresAt = 0;
}

function invalidateCategoryCache() {
  categoryCache.clear();
  categoryCacheTime = 0;
}

// ===== JSON parse helpers =====

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ===== DTO mapper =====

function toDTO(tool: {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  agentTip: string | null;
  outputFormat: string;
  outputLabel: string;
  outputItemNoun: string;
  analysisTitle: string;
  inputSchema: string;
  outputSchema: string | null;
  modelConfig: string;
  defaultCount: number;
  countOptions: string;
  minPlan: string;
  usageLimit: number;
  tags: string | null;
  isPopular: boolean;
  isNew: boolean;
  isEnabled: boolean;
  isSystem: boolean;
  sortOrder: number;
  version: number;
  examples: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; slug: string; name: string };
}): ToolDefinitionDTO {
  return {
    id: tool.id,
    slug: tool.slug,
    name: tool.name,
    description: tool.description,
    category: {
      id: tool.category.id,
      slug: tool.category.slug,
      name: tool.category.name,
    },
    icon: tool.icon,
    agentTip: tool.agentTip,
    outputFormat: (['text', 'json', 'items', 'structured'].includes(tool.outputFormat)
      ? tool.outputFormat
      : 'items') as OutputFormat,
    outputLabel: tool.outputLabel,
    outputItemNoun: tool.outputItemNoun,
    analysisTitle: tool.analysisTitle,
    inputSchema: safeParseJson<FieldConfig[]>(tool.inputSchema, []),
    outputSchema: safeParseJson<OutputSchema | null>(tool.outputSchema, null),
    modelConfig: safeParseJson<ModelConfig>(tool.modelConfig, {
      provider: 'gemini',
      model: 'default',
      temperature: 0.8,
    }),
    defaultCount: tool.defaultCount,
    countOptions: safeParseJson<number[]>(tool.countOptions, [1, 3, 5, 10, 15, 20]),
    minPlan: (['starter', 'creator', 'agency'].includes(tool.minPlan)
      ? tool.minPlan
      : 'starter') as Plan,
    usageLimit: tool.usageLimit,
    tags: safeParseJson<string[]>(tool.tags, []),
    isPopular: tool.isPopular,
    isNew: tool.isNew,
    isEnabled: tool.isEnabled,
    isSystem: tool.isSystem,
    sortOrder: tool.sortOrder,
    version: tool.version,
    examples: safeParseJson<ToolExample[] | null>(tool.examples, null),
    createdAt: tool.createdAt.toISOString(),
    updatedAt: tool.updatedAt.toISOString(),
  };
}

// ===== Public API =====

/**
 * List all enabled tools (with optional category filter + search).
 * Disabled tools are hidden from non-admin callers.
 */
export async function listTools(opts?: {
  categorySlug?: string;
  search?: string;
  includeDisabled?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ tools: ToolDefinitionDTO[]; total: number }> {
  const now = Date.now();
  const limit = opts?.limit ?? 200;
  const offset = opts?.offset ?? 0;
  const categorySlug = opts?.categorySlug;
  const search = opts?.search;
  const includeDisabled = opts?.includeDisabled ?? false;

  // Use list cache only when no filter/search is applied (the common case)
  const canUseListCache =
    !categorySlug && !search && !includeDisabled && offset === 0 && limit >= 200;

  if (canUseListCache && toolListCache.dtos && toolListCache.expiresAt > now) {
    return { tools: toolListCache.dtos, total: toolListCache.dtos.length };
  }

  const where: Record<string, unknown> = {};
  if (!includeDisabled) where.isEnabled = true;
  if (categorySlug) {
    where.category = { slug: categorySlug };
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { slug: { contains: search } },
    ];
  }

  const [tools, total] = await Promise.all([
    db.toolDefinition.findMany({
      where,
      include: { category: { select: { id: true, slug: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: Math.min(limit, 500),
      skip: offset,
    }),
    db.toolDefinition.count({ where }),
  ]);

  const dtos = tools.map(toDTO);

  if (canUseListCache) {
    toolListCache.dtos = dtos;
    toolListCache.expiresAt = now + CACHE_TTL_MS;
  }

  return { tools: dtos, total };
}

/**
 * Get a single tool by slug. Returns null if not found or disabled
 * (unless includeDisabled is true).
 */
export async function getToolBySlug(
  slug: string,
  opts?: { includeDisabled?: boolean },
): Promise<ToolDefinitionDTO | null> {
  const now = Date.now();
  const cached = toolCache.get(slug);
  if (cached && cached.expiresAt > now) {
    if (!opts?.includeDisabled && !cached.dto.isEnabled) return null;
    return cached.dto;
  }

  const tool = await db.toolDefinition.findUnique({
    where: { slug },
    include: { category: { select: { id: true, slug: true, name: true } } },
  });

  if (!tool) return null;
  if (!opts?.includeDisabled && !tool.isEnabled) return null;

  const dto = toDTO(tool);
  toolCache.set(slug, { dto, expiresAt: now + CACHE_TTL_MS });
  return dto;
}

/**
 * List all categories (sorted by sortOrder then name).
 */
export async function listCategories(): Promise<
  { id: string; slug: string; name: string; description: string | null; icon: string | null; color: string | null; sortOrder: number; toolCount: number }[]
> {
  const now = Date.now();
  if (categoryCache.size > 0 && categoryCacheTime > 0 && now - categoryCacheTime < CACHE_TTL_MS * 10) {
    // Return full data from DB (cache only stores id/slug/name for lookups)
  }

  const categories = await db.toolCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { tools: true } } },
  });

  // Refresh the lookup cache
  categoryCache.clear();
  for (const c of categories) {
    categoryCache.set(c.slug, { id: c.id, slug: c.slug, name: c.name });
  }
  categoryCacheTime = now;

  return categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon: c.icon,
    color: c.color,
    sortOrder: c.sortOrder,
    toolCount: c._count.tools,
  }));
}

/**
 * Resolve a category id from slug (cached).
 */
export async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  if (categoryCache.size > 0 && categoryCache.has(slug)) {
    return categoryCache.get(slug)!.id;
  }
  await listCategories(); // populate cache
  return categoryCache.get(slug)?.id ?? null;
}

/**
 * Get the raw DB row for a tool (for the engine — includes prompt template).
 * The DTO above intentionally does NOT expose the prompt template.
 */
export async function getToolRaw(slug: string): Promise<{
  id: string;
  slug: string;
  name: string;
  outputFormat: string;
  outputLabel: string;
  outputItemNoun: string;
  analysisTitle: string;
  inputSchema: string;
  outputSchema: string | null;
  promptTemplate: string;
  modelConfig: string;
  defaultCount: number;
  countOptions: string;
  minPlan: string;
  usageLimit: number;
  isEnabled: boolean;
  isSystem: boolean;
} | null> {
  const tool = await db.toolDefinition.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      outputFormat: true,
      outputLabel: true,
      outputItemNoun: true,
      analysisTitle: true,
      inputSchema: true,
      outputSchema: true,
      promptTemplate: true,
      modelConfig: true,
      defaultCount: true,
      countOptions: true,
      minPlan: true,
      usageLimit: true,
      isEnabled: true,
      isSystem: true,
    },
  });
  return tool;
}

// ===== Admin mutations =====

export interface CreateToolInput {
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  icon?: string;
  agentTip?: string;
  outputFormat: OutputFormat;
  outputLabel?: string;
  outputItemNoun?: string;
  analysisTitle?: string;
  inputSchema: FieldConfig[];
  outputSchema?: OutputSchema | null;
  promptTemplate: { system: string; user: string };
  modelConfig?: ModelConfig;
  defaultCount?: number;
  countOptions?: number[];
  minPlan?: Plan;
  usageLimit?: number;
  tags?: string[];
  isPopular?: boolean;
  isNew?: boolean;
  examples?: ToolExample[] | null;
}

export async function createTool(input: CreateToolInput): Promise<ToolDefinitionDTO> {
  const categoryId = await getCategoryIdBySlug(input.categorySlug);
  if (!categoryId) {
    throw new ToolError('CATEGORY_NOT_FOUND', `Category "${input.categorySlug}" not found.`, 404);
  }

  const existing = await db.toolDefinition.findUnique({ where: { slug: input.slug } });
  if (existing) {
    throw new ToolError('SLUG_EXISTS', `A tool with slug "${input.slug}" already exists.`, 409);
  }

  const tool = await db.toolDefinition.create({
    data: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      categoryId,
      icon: input.icon ?? null,
      agentTip: input.agentTip ?? null,
      outputFormat: input.outputFormat,
      outputLabel: input.outputLabel ?? 'Your Generated Results',
      outputItemNoun: input.outputItemNoun ?? 'result',
      analysisTitle: input.analysisTitle ?? 'Why these results work?',
      inputSchema: JSON.stringify(input.inputSchema),
      outputSchema: input.outputSchema ? JSON.stringify(input.outputSchema) : null,
      promptTemplate: JSON.stringify(input.promptTemplate),
      modelConfig: JSON.stringify(input.modelConfig ?? { provider: 'gemini', model: 'default', temperature: 0.8 }),
      defaultCount: input.defaultCount ?? 5,
      countOptions: JSON.stringify(input.countOptions ?? [1, 3, 5, 10, 15, 20]),
      minPlan: input.minPlan ?? 'starter',
      usageLimit: input.usageLimit ?? 0,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      isPopular: input.isPopular ?? false,
      isNew: input.isNew ?? false,
      isEnabled: true,
      isSystem: false, // admin-created tools are not system tools
      examples: input.examples ? JSON.stringify(input.examples) : null,
    },
    include: { category: { select: { id: true, slug: true, name: true } } },
  });

  invalidateToolCache(tool.slug);
  return toDTO(tool);
}

export interface UpdateToolInput {
  name?: string;
  description?: string;
  categorySlug?: string;
  icon?: string | null;
  agentTip?: string | null;
  outputFormat?: OutputFormat;
  outputLabel?: string;
  outputItemNoun?: string;
  analysisTitle?: string;
  inputSchema?: FieldConfig[];
  outputSchema?: OutputSchema | null;
  promptTemplate?: { system: string; user: string };
  modelConfig?: ModelConfig;
  defaultCount?: number;
  countOptions?: number[];
  minPlan?: Plan;
  usageLimit?: number;
  tags?: string[];
  isPopular?: boolean;
  isNew?: boolean;
  isEnabled?: boolean;
  examples?: ToolExample[] | null;
}

export async function updateTool(slug: string, input: UpdateToolInput): Promise<ToolDefinitionDTO> {
  const existing = await db.toolDefinition.findUnique({ where: { slug } });
  if (!existing) {
    throw new ToolError('TOOL_NOT_FOUND', `Tool "${slug}" not found.`, 404);
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.agentTip !== undefined) updateData.agentTip = input.agentTip;
  if (input.outputFormat !== undefined) updateData.outputFormat = input.outputFormat;
  if (input.outputLabel !== undefined) updateData.outputLabel = input.outputLabel;
  if (input.outputItemNoun !== undefined) updateData.outputItemNoun = input.outputItemNoun;
  if (input.analysisTitle !== undefined) updateData.analysisTitle = input.analysisTitle;
  if (input.inputSchema !== undefined) updateData.inputSchema = JSON.stringify(input.inputSchema);
  if (input.outputSchema !== undefined) updateData.outputSchema = input.outputSchema ? JSON.stringify(input.outputSchema) : null;
  if (input.promptTemplate !== undefined) updateData.promptTemplate = JSON.stringify(input.promptTemplate);
  if (input.modelConfig !== undefined) updateData.modelConfig = JSON.stringify(input.modelConfig);
  if (input.defaultCount !== undefined) updateData.defaultCount = input.defaultCount;
  if (input.countOptions !== undefined) updateData.countOptions = JSON.stringify(input.countOptions);
  if (input.minPlan !== undefined) updateData.minPlan = input.minPlan;
  if (input.usageLimit !== undefined) updateData.usageLimit = input.usageLimit;
  if (input.tags !== undefined) updateData.tags = JSON.stringify(input.tags);
  if (input.isPopular !== undefined) updateData.isPopular = input.isPopular;
  if (input.isNew !== undefined) updateData.isNew = input.isNew;
  if (input.isEnabled !== undefined) updateData.isEnabled = input.isEnabled;
  if (input.examples !== undefined) updateData.examples = input.examples ? JSON.stringify(input.examples) : null;

  if (input.categorySlug !== undefined) {
    const categoryId = await getCategoryIdBySlug(input.categorySlug);
    if (!categoryId) {
      throw new ToolError('CATEGORY_NOT_FOUND', `Category "${input.categorySlug}" not found.`, 404);
    }
    updateData.categoryId = categoryId;
  }

  // Bump version on any content change
  if (Object.keys(updateData).length > 0) {
    updateData.version = { increment: 1 };
  }

  const tool = await db.toolDefinition.update({
    where: { slug },
    data: updateData,
    include: { category: { select: { id: true, slug: true, name: true } } },
  });

  invalidateToolCache(slug);
  return toDTO(tool);
}

export async function deleteTool(slug: string): Promise<void> {
  const existing = await db.toolDefinition.findUnique({ where: { slug } });
  if (!existing) {
    throw new ToolError('TOOL_NOT_FOUND', `Tool "${slug}" not found.`, 404);
  }
  if (existing.isSystem) {
    throw new ToolError('CANNOT_DELETE_SYSTEM_TOOL', 'System tools cannot be deleted. Disable them instead.', 403);
  }
  await db.toolDefinition.delete({ where: { slug } });
  invalidateToolCache(slug);
}

// ===== Category mutations (used by seed + admin) =====

export async function upsertCategory(input: {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}): Promise<{ id: string; slug: string; name: string }> {
  const cat = await db.toolCategory.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      description: input.description,
      icon: input.icon,
      color: input.color,
      sortOrder: input.sortOrder,
    },
    create: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      icon: input.icon,
      color: input.color,
      sortOrder: input.sortOrder,
    },
  });
  invalidateCategoryCache();
  return { id: cat.id, slug: cat.slug, name: cat.name };
}

/**
 * Bulk upsert tool definitions (used by the seed script). Skips tools
 * that already exist with the same slug (preserves admin edits).
 */
export async function upsertTool(input: {
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  icon?: string;
  agentTip?: string;
  outputFormat?: OutputFormat;
  outputLabel?: string;
  outputItemNoun?: string;
  analysisTitle?: string;
  inputSchema: FieldConfig[];
  outputSchema?: OutputSchema | null;
  promptTemplate: { system: string; user: string };
  modelConfig?: ModelConfig;
  defaultCount?: number;
  countOptions?: number[];
  minPlan?: Plan;
  usageLimit?: number;
  tags?: string[];
  isPopular?: boolean;
  isNew?: boolean;
  examples?: ToolExample[] | null;
  sortOrder?: number;
}): Promise<{ id: string; slug: string; created: boolean }> {
  const categoryId = await getCategoryIdBySlug(input.categorySlug);
  if (!categoryId) {
    throw new ToolError('CATEGORY_NOT_FOUND', `Category "${input.categorySlug}" not found (needed for tool "${input.slug}").`, 404);
  }

  const existing = await db.toolDefinition.findUnique({ where: { slug: input.slug } });
  if (existing) {
    // Update system tools with the latest seed (preserves enabled flag + usageLimit overrides)
    await db.toolDefinition.update({
      where: { slug: input.slug },
      data: {
        name: input.name,
        description: input.description,
        categoryId,
        icon: input.icon ?? existing.icon,
        agentTip: input.agentTip ?? existing.agentTip,
        outputFormat: input.outputFormat ?? existing.outputFormat,
        outputLabel: input.outputLabel ?? existing.outputLabel,
        outputItemNoun: input.outputItemNoun ?? existing.outputItemNoun,
        analysisTitle: input.analysisTitle ?? existing.analysisTitle,
        inputSchema: JSON.stringify(input.inputSchema),
        outputSchema: input.outputSchema ? JSON.stringify(input.outputSchema) : existing.outputSchema,
        promptTemplate: JSON.stringify(input.promptTemplate),
        modelConfig: JSON.stringify(input.modelConfig ?? { provider: 'gemini', model: 'default', temperature: 0.8 }),
        defaultCount: input.defaultCount ?? existing.defaultCount,
        countOptions: JSON.stringify(input.countOptions ?? [1, 3, 5, 10, 15, 20]),
        isPopular: input.isPopular ?? existing.isPopular,
        isNew: input.isNew ?? existing.isNew,
        tags: input.tags ? JSON.stringify(input.tags) : existing.tags,
        examples: input.examples ? JSON.stringify(input.examples) : existing.examples,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        isSystem: true,
      },
    });
    invalidateToolCache(input.slug);
    return { id: existing.id, slug: input.slug, created: false };
  }

  const tool = await db.toolDefinition.create({
    data: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      categoryId,
      icon: input.icon ?? null,
      agentTip: input.agentTip ?? null,
      outputFormat: input.outputFormat ?? 'items',
      outputLabel: input.outputLabel ?? 'Your Generated Results',
      outputItemNoun: input.outputItemNoun ?? 'result',
      analysisTitle: input.analysisTitle ?? 'Why these results work?',
      inputSchema: JSON.stringify(input.inputSchema),
      outputSchema: input.outputSchema ? JSON.stringify(input.outputSchema) : null,
      promptTemplate: JSON.stringify(input.promptTemplate),
      modelConfig: JSON.stringify(input.modelConfig ?? { provider: 'gemini', model: 'default', temperature: 0.8 }),
      defaultCount: input.defaultCount ?? 5,
      countOptions: JSON.stringify(input.countOptions ?? [1, 3, 5, 10, 15, 20]),
      minPlan: input.minPlan ?? 'starter',
      usageLimit: input.usageLimit ?? 0,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      isPopular: input.isPopular ?? false,
      isNew: input.isNew ?? false,
      isEnabled: true,
      isSystem: true,
      examples: input.examples ? JSON.stringify(input.examples) : null,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  invalidateToolCache(input.slug);
  return { id: tool.id, slug: input.slug, created: true };
}
