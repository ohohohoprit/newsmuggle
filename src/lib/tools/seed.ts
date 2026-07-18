/**
 * Tool seed — maps the existing 95 tools from `src/smuggler/data/tools.ts`
 * and their configs from `src/smuggler/lib/tool-configs.ts` into
 * ToolDefinition rows.
 *
 * This is a READ-ONLY consumer of the frontend data files — it does not
 * modify them. The seed is idempotent: running it twice updates existing
 * system tools in place (preserving isEnabled / usageLimit overrides
 * where possible) and creates new ones.
 *
 * The seed also derives a generic prompt template per tool using the
 * tool name + description + input fields, plus preserves any specific
 * prompt from `src/smuggler/lib/tool-prompts.ts` when available.
 */
import { ALL_TOOLS, type SmugglerTool, type ToolCategory } from '@/smuggler/data/tools';
import { getToolConfig } from '@/smuggler/lib/tool-configs';
import { getToolPrompt } from '@/smuggler/lib/tool-prompts';
import { upsertCategory, upsertTool } from '@/lib/tools/registry';
import type { FieldConfig, ModelConfig, OutputFormat, Plan, PromptTemplate } from '@/lib/tools/types';

// ===== Category mapping (frontend category name -> backend slug) =====

const CATEGORY_MAP: { name: ToolCategory; slug: string; description: string; icon: string; color: string; sortOrder: number }[] = [
  { name: 'Writing', slug: 'writing', description: 'Blogs, scripts, emails, and long-form content tools.', icon: 'PenLine', color: '#597F56', sortOrder: 1 },
  { name: 'SEO', slug: 'seo', description: 'Search optimization, keywords, and metadata tools.', icon: 'Target', color: '#B8A03E', sortOrder: 2 },
  { name: 'Video', slug: 'video', description: 'YouTube, shorts, thumbnails, and video script tools.', icon: 'Video', color: '#4A7A8C', sortOrder: 3 },
  { name: 'Social Media', slug: 'social-media', description: 'Captions, hashtags, and platform-specific post tools.', icon: 'Instagram', color: '#A84841', sortOrder: 4 },
  { name: 'Repurposing', slug: 'repurposing', description: 'Transform content between formats and platforms.', icon: 'Share2', color: '#755B8F', sortOrder: 5 },
  { name: 'Analytics', slug: 'analytics', description: 'Calculators for revenue, engagement, and growth metrics.', icon: 'BarChart3', color: '#B87B3E', sortOrder: 6 },
  { name: 'Planning', slug: 'planning', description: 'Calendars, checklists, and project planning tools.', icon: 'Calendar', color: '#5DADE2', sortOrder: 7 },
  { name: 'Business', slug: 'business', description: 'Brand, contracts, proposals, and business docs.', icon: 'Briefcase', color: '#8B6F47', sortOrder: 8 },
  { name: 'AI Utility', slug: 'ai-utility', description: 'Prompts, transcription, images, and AI helpers.', icon: 'Bot', color: '#6FC276', sortOrder: 9 },
];

function categorySlugFor(name: ToolCategory): string {
  return CATEGORY_MAP.find((c) => c.name === name)?.slug ?? 'ai-utility';
}

function iconSlugFor(icon: unknown): string {
  // The frontend stores Lucide icon components; we only need the name.
  if (icon && typeof icon === 'object' && 'displayName' in icon) {
    return String((icon as { displayName: unknown }).displayName ?? 'Wrench');
  }
  if (icon && typeof icon === 'object' && 'name' in icon) {
    return String((icon as { name: unknown }).name ?? 'Wrench');
  }
  return 'Wrench';
}

// ===== Prompt template builder =====

const JSON_INSTRUCTION = `You MUST respond with valid JSON only — no markdown, no code fences, no commentary.
The JSON shape is EXACTLY this structure (example with 2 items):

{"items":[{"text":"first result","score":92,"rationale":"why it works"},{"text":"second result","score":85,"rationale":"why it works"}],"summary":"overall summary sentence","metrics":{"curiosity":9.2,"specificity":8.7,"benefitDriven":9.5,"emotionalImpact":8.3}}

CRITICAL RULES:
- "items" must be an ARRAY of SEPARATE objects, each with its own "text", "score", and "rationale" keys.
- Do NOT put multiple "text" keys in the same object. Each item is a separate object in the array.
- "score" is an integer 50-100.
- "rationale" is ONE short sentence.
- "summary" is ONE sentence.
- "metrics" are 0-10 floats.
- Generate exactly the requested number of items, each unique.`;

/**
 * Build a generic, tool-aware prompt template from the tool name,
 * description, and its input fields. Tools with a specific prompt in
 * tool-prompts.ts get that prompt instead.
 */
function buildPromptTemplate(tool: SmugglerTool, fields: FieldConfig[]): PromptTemplate {
  // Check if tool-prompts.ts has a specific config for this tool.
  // We reuse the existing getToolPrompt() which already encapsulates
  // 15+ tool-specific prompts + a generic fallback.
  const existing = getToolPrompt(tool.id);

  // If the existing config is the generic fallback (not tool-specific),
  // build a richer generic template using the tool's own fields.
  const isGeneric = ![
    'hook-generator', 'title-optimizer', 'script-writer', 'ai-writer',
    'caption-generator', 'youtube-description-generator', 'linkedin-post-generator',
    'twitter-thread-generator', 'blog-ideas', 'email-writer', 'summarizer',
    'humanizer', 'content-improver', 'keyword-research', 'viral-topic-finder',
    'prompt-generator',
  ].includes(tool.id);

  if (!isGeneric) {
    // Convert the existing ToolPromptConfig (system + buildUserMessage fn)
    // into a static template. We invoke buildUserMessage with placeholder
    // vars to extract the template structure, then replace the actual
    // values with {{var}} tokens.
    const sampleInputs: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === 'count') continue;
      sampleInputs[f.key] = `{{${f.key}}}`;
    }
    sampleInputs.toolName = tool.name;
    const userMessage = existing.buildUserMessage(sampleInputs, 5).replace(/\{\{count\}\}/g, '5');
    // The count is interpolated by the engine; replace the literal "5"
    // we passed with a {{count}} token where it appears after "Generate ".
    const userTemplate = userMessage.replace(/Generate 5 /g, 'Generate {{count}} ').replace(/Generate \$\{count\} /g, 'Generate {{count}} ');
    return {
      system: existing.system,
      user: userTemplate,
    };
  }

  // Generic template — tool-aware
  const fieldList = fields
    .filter((f) => f.type !== 'count')
    .map((f) => `- ${f.label} ({{${f.key}}}): ${f.placeholder ?? ''}`)
    .join('\n');

  const system = `You are Content Smuggler's "${tool.name}" — ${tool.desc} You act as a senior strategist, viral copywriter, and optimization expert. You produce sharp, actionable, premium content that creators can immediately use. Always follow the user's tone, platform, and language constraints. Never produce generic filler — every result must be specific, useful, and high-quality. ${JSON_INSTRUCTION}`;

  const user = `You are operating as the "${tool.name}" tool.

Inputs:
${fieldList}

Generate {{count}} high-quality, ready-to-use results for this creator. Each result must be:
- Specific to the inputs provided (not generic)
- Actionable and practical
- Tailored to the platform/tone/audience if specified
- Professional and polished

Return {{count}} unique results with scores and rationales.`;

  return { system, user };
}

// ===== Examples builder =====

function buildExamples(tool: SmugglerTool): { title: string; inputs: Record<string, string> }[] | null {
  // A couple of simple example inputs per tool — enough to populate the
  // "Examples" section without being prescriptive.
  const topicExamples: Record<string, string> = {
    'hook-generator': 'productivity hacks for creators',
    'title-optimizer': 'how to grow on YouTube in 2025',
    'script-writer': '5 morning habits of successful entrepreneurs',
    'ai-writer': 'a blog post about remote work productivity',
    'caption-generator': 'behind the scenes of a product launch',
    'blog-ideas': 'personal finance for freelancers',
    'email-writer': 'follow-up after a sponsorship pitch',
    'keyword-research': 'content creation tools',
    'youtube-description-generator': 'a tutorial on video editing',
    'linkedin-post-generator': 'lessons from 3 years of entrepreneurship',
  };
  const topic = topicExamples[tool.id] ?? 'a topic in your niche';
  return [
    {
      title: `${tool.name} example`,
      inputs: { content: topic, audience: 'Content Creators', tone: 'Casual', language: 'English' },
    },
  ];
}

// ===== Main seed function =====

export interface SeedResult {
  categoriesCreated: number;
  categoriesUpdated: number;
  toolsCreated: number;
  toolsUpdated: number;
  total: number;
}

export async function seedTools(): Promise<SeedResult> {
  // 1. Upsert all categories first
  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  for (const cat of CATEGORY_MAP) {
    // We can't tell create vs update from upsert, so count both as "upserted"
    await upsertCategory({
      slug: cat.slug,
      name: cat.name as string,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      sortOrder: cat.sortOrder,
    });
    categoriesUpdated++;
  }

  // 2. Upsert all tools
  let toolsCreated = 0;
  let toolsUpdated = 0;

  for (let i = 0; i < ALL_TOOLS.length; i++) {
    const tool = ALL_TOOLS[i];
    const config = getToolConfig(tool.id, tool);

    // Convert frontend FieldConfig shape to backend FieldConfig shape
    // (they're intentionally compatible, but we strip any non-serializable bits)
    const inputSchema: FieldConfig[] = config.fields.map((f) => ({
      type: f.type,
      key: f.key,
      label: f.label,
      ...(f.placeholder ? { placeholder: f.placeholder } : {}),
      ...(f.required ? { required: f.required } : {}),
      ...(f.optional ? { optional: f.optional } : {}),
      ...(f.maxLength ? { maxLength: f.maxLength } : {}),
      ...(f.rows ? { rows: f.rows } : {}),
      ...(f.options ? { options: f.options } : {}),
      ...(f.counts ? { counts: f.counts } : {}),
      ...(f.defaultValue !== undefined ? { defaultValue: f.defaultValue } : {}),
    }));

    const promptTemplate = buildPromptTemplate(tool, inputSchema);

    // Decide output format — most tools use 'items'; a few calculators
    // would use 'structured' but we keep 'items' for consistency with
    // the existing frontend which expects the items shape.
    const outputFormat: OutputFormat = 'items';

    const modelConfig: ModelConfig = {
      provider: 'gemini',
      model: 'default',
      temperature: 0.8,
    };

    // Plan requirement — popular / heavy tools require creator plan
    const minPlan: Plan = ['repurpose-engine', 'channel-audit', 'video-to-blog', 'podcast-to-blog'].includes(tool.id)
      ? 'creator'
      : 'starter';

    const examples = buildExamples(tool);

    const result = await upsertTool({
      slug: tool.id,
      name: tool.name,
      description: tool.desc,
      categorySlug: categorySlugFor(tool.category),
      icon: iconSlugFor(tool.icon),
      agentTip: tool.agentTip,
      outputFormat,
      outputLabel: config.outputLabel,
      outputItemNoun: config.outputItemNoun,
      analysisTitle: config.analysisTitle,
      inputSchema,
      promptTemplate,
      modelConfig,
      defaultCount: config.defaultCount,
      countOptions: config.countOptions,
      minPlan,
      usageLimit: 0, // use plan default
      tags: [tool.category],
      isPopular: !!tool.isPopular,
      isNew: !!tool.isNew,
      examples,
      sortOrder: i,
    });

    if (result.created) toolsCreated++;
    else toolsUpdated++;
  }

  return {
    categoriesCreated,
    categoriesUpdated,
    toolsCreated,
    toolsUpdated,
    total: ALL_TOOLS.length,
  };
}

/**
 * Get the count of tools that would be seeded (without running the seed).
 * Used by the seed API to preview.
 */
export function getSeedableToolCount(): number {
  return ALL_TOOLS.length;
}
