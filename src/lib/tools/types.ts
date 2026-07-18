/**
 * Shared types and constants for the tool registry + execution engine.
 *
 * Kept in a standalone module so it can be imported by the registry,
 * engine, validation, and route handlers without circular deps.
 */

// ===== Output formats =====

export type OutputFormat = 'text' | 'json' | 'items' | 'structured';

export const ALL_OUTPUT_FORMATS: OutputFormat[] = ['text', 'json', 'items', 'structured'];

// ===== Plan requirement =====

export type Plan = 'starter' | 'creator' | 'agency';

export const PLAN_ORDER: Plan[] = ['starter', 'creator', 'agency'];

export function planRank(p: string): number {
  const idx = PLAN_ORDER.indexOf(p as Plan);
  return idx === -1 ? 0 : idx;
}

// ===== Field schema (input schema) =====

export type FieldType =
  | 'textarea'
  | 'text'
  | 'select'
  | 'platform'
  | 'count'
  | 'tone'
  | 'language';

export const ALL_FIELD_TYPES: FieldType[] = [
  'textarea',
  'text',
  'select',
  'platform',
  'count',
  'tone',
  'language',
];

export interface FieldConfig {
  type: FieldType;
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  maxLength?: number;
  rows?: number;
  options?: string[];
  counts?: number[];
  defaultValue?: string | number;
}

// ===== Output schema descriptor (optional, for structured/json formats) =====

export interface OutputSchemaField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
}

export interface OutputSchema {
  fields?: OutputSchemaField[];
  /** For 'items' format: describes the shape of each item. */
  itemShape?: { key: string; label: string; type: 'string' | 'number' }[];
}

// ===== Model config =====

export type AIProviderSlug = 'zai' | 'gemini' | 'openai' | 'claude' | 'grok' | 'deepseek';

export const ALL_AI_PROVIDERS: AIProviderSlug[] = ['zai', 'gemini', 'openai', 'claude', 'grok', 'deepseek'];

export interface ModelConfig {
  provider: AIProviderSlug;
  model: string;
  temperature?: number;
  maxTokens?: number;
  thinkingEnabled?: boolean;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: 'gemini',
  model: 'default',
  temperature: 0.8,
  thinkingEnabled: false,
};

// ===== Prompt template =====

export interface PromptTemplate {
  /** The system/role prompt. Supports {{var}} interpolation. */
  system: string;
  /** The user message template. Supports {{var}} interpolation. */
  user: string;
}

// ===== Tool definition (the shape returned to API consumers) =====

export interface ToolDefinitionDTO {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: {
    id: string;
    slug: string;
    name: string;
  };
  icon: string | null;
  agentTip: string | null;
  outputFormat: OutputFormat;
  outputLabel: string;
  outputItemNoun: string;
  analysisTitle: string;
  inputSchema: FieldConfig[];
  outputSchema: OutputSchema | null;
  modelConfig: ModelConfig;
  defaultCount: number;
  countOptions: number[];
  minPlan: Plan;
  usageLimit: number;
  tags: string[];
  isPopular: boolean;
  isNew: boolean;
  isEnabled: boolean;
  isSystem: boolean;
  sortOrder: number;
  version: number;
  examples: ToolExample[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface ToolExample {
  title: string;
  inputs: Record<string, string>;
  output?: string;
}

// ===== Execution result =====

export interface ToolItem {
  text: string;
  score?: number;
  rationale?: string;
}

export interface ToolMetrics {
  curiosity?: number;
  specificity?: number;
  benefitDriven?: number;
  emotionalImpact?: number;
  [k: string]: number | undefined;
}

export interface ToolExecutionResult {
  executionId: string;
  toolId: string;
  toolSlug: string;
  outputFormat: OutputFormat;
  /** For 'items' format. */
  items?: ToolItem[];
  /** For 'text' format. */
  text?: string;
  /** For 'json' / 'structured' formats. */
  data?: unknown;
  summary?: string;
  metrics?: ToolMetrics;
  status: 'success' | 'failed' | 'partial';
  latencyMs: number;
  errorMessage?: string;
  createdAt: string;
}

// ===== Execution history item =====

export interface ToolExecutionHistoryItem {
  id: string;
  toolId: string;
  toolSlug: string;
  toolName: string;
  inputs: Record<string, string>;
  outputFormat: OutputFormat;
  status: string;
  summary: string | null;
  latencyMs: number;
  createdAt: string;
}

// ===== Errors =====

export class ToolError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ToolError';
  }
}
