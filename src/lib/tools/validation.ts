/**
 * Validation schemas for tool inputs.
 * Pure functions — throw on invalid input.
 */
import {
  type OutputFormat,
  type Plan,
  type FieldType,
  type FieldConfig,
  type ModelConfig,
  ALL_OUTPUT_FORMATS,
  PLAN_ORDER,
  ALL_FIELD_TYPES,
} from '@/lib/tools/types';

// ===== Slug =====

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

export function validateToolSlug(slug: unknown): string {
  if (typeof slug !== 'string' || !slug.trim()) {
    throw new Error('Tool slug is required.');
  }
  const trimmed = slug.trim().toLowerCase();
  if (!SLUG_RE.test(trimmed)) {
    throw new Error('Slug must be 2-80 chars: lowercase letters, numbers, and hyphens only.');
  }
  return trimmed;
}

export function validateCategorySlug(slug: unknown): string {
  if (typeof slug !== 'string' || !slug.trim()) {
    throw new Error('Category slug is required.');
  }
  const trimmed = slug.trim().toLowerCase();
  if (!SLUG_RE.test(trimmed)) {
    throw new Error('Category slug must be 2-80 chars: lowercase letters, numbers, and hyphens only.');
  }
  return trimmed;
}

// ===== Name / description =====

export function validateToolName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Tool name is required.');
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    throw new Error('Tool name must be 2-120 characters.');
  }
  return trimmed;
}

export function validateCategoryName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Category name is required.');
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    throw new Error('Category name must be 2-60 characters.');
  }
  return trimmed;
}

export function validateToolDescription(desc: unknown): string {
  if (typeof desc !== 'string' || !desc.trim()) {
    throw new Error('Tool description is required.');
  }
  const trimmed = desc.trim();
  if (trimmed.length > 500) {
    throw new Error('Tool description must be 500 characters or fewer.');
  }
  return trimmed;
}

// ===== Enums =====

export function validateOutputFormat(format: unknown): OutputFormat {
  if (format === undefined || format === null) return 'items';
  if (typeof format !== 'string') {
    throw new Error('outputFormat must be a string.');
  }
  const f = format.trim().toLowerCase() as OutputFormat;
  if (!ALL_OUTPUT_FORMATS.includes(f)) {
    throw new Error(`outputFormat must be one of: ${ALL_OUTPUT_FORMATS.join(', ')}.`);
  }
  return f;
}

export function validatePlan(plan: unknown): Plan {
  if (plan === undefined || plan === null) return 'starter';
  if (typeof plan !== 'string') {
    throw new Error('minPlan must be a string.');
  }
  const p = plan.trim().toLowerCase() as Plan;
  if (!PLAN_ORDER.includes(p)) {
    throw new Error(`minPlan must be one of: ${PLAN_ORDER.join(', ')}.`);
  }
  return p;
}

export function validateFieldType(type: unknown): FieldType {
  if (typeof type !== 'string') {
    throw new Error('Field type is required.');
  }
  const t = type.trim().toLowerCase() as FieldType;
  if (!ALL_FIELD_TYPES.includes(t)) {
    throw new Error(`Field type must be one of: ${ALL_FIELD_TYPES.join(', ')}.`);
  }
  return t;
}

// ===== Field config array =====

export function validateFieldConfigs(raw: unknown): FieldConfig[] {
  if (!Array.isArray(raw)) {
    throw new Error('inputSchema must be an array of field configs.');
  }
  if (raw.length === 0) {
    throw new Error('inputSchema must contain at least one field.');
  }
  const keys = new Set<string>();
  const fields: FieldConfig[] = [];
  for (let i = 0; i < raw.length; i++) {
    const f = raw[i] as Record<string, unknown>;
    if (!f || typeof f !== 'object') {
      throw new Error(`inputSchema[${i}] must be an object.`);
    }
    const type = validateFieldType(f.type);
    const key = typeof f.key === 'string' ? f.key.trim() : '';
    if (!key) {
      throw new Error(`inputSchema[${i}].key is required.`);
    }
    if (keys.has(key)) {
      throw new Error(`inputSchema[${i}].key "${key}" is duplicated.`);
    }
    keys.add(key);
    const label = typeof f.label === 'string' ? f.label.trim() : '';
    if (!label) {
      throw new Error(`inputSchema[${i}].label is required.`);
    }
    const field: FieldConfig = { type, key, label };
    if (typeof f.placeholder === 'string') field.placeholder = f.placeholder;
    if (typeof f.required === 'boolean') field.required = f.required;
    if (typeof f.optional === 'boolean') field.optional = f.optional;
    if (typeof f.maxLength === 'number') field.maxLength = f.maxLength;
    if (typeof f.rows === 'number') field.rows = f.rows;
    if (Array.isArray(f.options)) {
      field.options = f.options.map(String);
    }
    if (Array.isArray(f.counts)) {
      field.counts = f.counts.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
    }
    if (f.defaultValue !== undefined && f.defaultValue !== null) {
      field.defaultValue = typeof f.defaultValue === 'number' ? f.defaultValue : String(f.defaultValue);
    }
    fields.push(field);
  }
  return fields;
}

// ===== Model config =====

export function validateModelConfig(raw: unknown): ModelConfig {
  if (raw === undefined || raw === null) {
    return { provider: 'gemini', model: 'default', temperature: 0.8 };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('modelConfig must be a JSON object.');
  }
  const m = raw as Record<string, unknown>;
  const provider = (typeof m.provider === 'string' ? m.provider : 'zai') as ModelConfig['provider'];
  const ALL_PROVIDERS = ['zai', 'gemini', 'openai', 'claude', 'grok', 'deepseek'];
  if (!ALL_PROVIDERS.includes(provider)) {
    throw new Error(`modelConfig.provider must be one of: ${ALL_PROVIDERS.join(', ')}.`);
  }
  const model = typeof m.model === 'string' && m.model.trim() ? m.model.trim() : 'default';
  const temperature =
    typeof m.temperature === 'number' && Number.isFinite(m.temperature)
      ? Math.max(0, Math.min(2, m.temperature))
      : 0.8;
  const maxTokens =
    typeof m.maxTokens === 'number' && Number.isFinite(m.maxTokens) && m.maxTokens > 0
      ? Math.floor(m.maxTokens)
      : undefined;
  const thinkingEnabled = typeof m.thinkingEnabled === 'boolean' ? m.thinkingEnabled : false;
  return { provider, model, temperature, maxTokens, thinkingEnabled };
}

// ===== Count options =====

export function validateCountOptions(raw: unknown): number[] {
  if (raw === undefined || raw === null) return [1, 3, 5, 10, 15, 20];
  if (!Array.isArray(raw)) {
    throw new Error('countOptions must be an array of numbers.');
  }
  const opts = raw
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 50)
    .map((n) => Math.floor(n));
  if (opts.length === 0) return [1, 3, 5, 10, 15, 20];
  return Array.from(new Set(opts)).sort((a, b) => a - b);
}

// ===== Tags =====

export function validateTags(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new Error('tags must be an array of strings.');
  }
  return raw
    .map((t) => (typeof t === 'string' ? t.trim().toLowerCase() : ''))
    .filter((t) => t.length > 0 && t.length <= 40)
    .slice(0, 20);
}

// ===== Run input validation against a tool's field schema =====

export interface ValidatedRunInput {
  inputs: Record<string, string>;
  count: number;
}

/**
 * Validate the runtime inputs against the tool's declared field schema.
 * Returns the cleaned inputs + resolved count.
 */
export function validateRunInputs(
  fields: FieldConfig[],
  body: Record<string, unknown>,
): ValidatedRunInput {
  const inputs: Record<string, string> = {};

  for (const field of fields) {
    if (field.type === 'count') {
      // count is a meta-field, not a generation input
      continue;
    }
    const raw = body[field.key];
    const isRequired = field.required && !field.optional;

    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
      if (isRequired) {
        throw new Error(`Field "${field.label}" is required.`);
      }
      // optional field — skip or use default
      if (field.defaultValue !== undefined && field.defaultValue !== '') {
        inputs[field.key] = String(field.defaultValue);
      }
      continue;
    }

    const value = typeof raw === 'string' ? raw : String(raw);
    const trimmed = value;

    if (field.maxLength && trimmed.length > field.maxLength) {
      throw new Error(`Field "${field.label}" must be ${field.maxLength} characters or fewer.`);
    }

    if (field.type === 'select' || field.type === 'platform' || field.type === 'tone' || field.type === 'language') {
      if (field.options && field.options.length > 0 && !field.options.includes(trimmed)) {
        // Allow but coerce to default if invalid
        if (field.defaultValue !== undefined) {
          inputs[field.key] = String(field.defaultValue);
          continue;
        }
      }
    }

    inputs[field.key] = trimmed;
  }

  // Resolve count
  let count = 5;
  const countField = fields.find((f) => f.type === 'count');
  if (countField) {
    const rawCount = body[countField.key] ?? body.count;
    if (rawCount !== undefined && rawCount !== null) {
      const n = typeof rawCount === 'number' ? rawCount : parseInt(String(rawCount), 10);
      if (Number.isFinite(n) && n > 0) {
        count = Math.max(1, Math.min(50, Math.floor(n)));
      }
    } else if (countField.defaultValue !== undefined) {
      const n = typeof countField.defaultValue === 'number' ? countField.defaultValue : parseInt(String(countField.defaultValue), 10);
      if (Number.isFinite(n) && n > 0) count = Math.max(1, Math.min(50, Math.floor(n)));
    }
    if (countField.counts && countField.counts.length > 0 && !countField.counts.includes(count)) {
      // snap to nearest allowed count
      count = countField.counts.reduce((prev, curr) =>
        Math.abs(curr - count) < Math.abs(prev - count) ? curr : prev,
      );
    }
  } else if (typeof body.count === 'number' && Number.isFinite(body.count) && body.count > 0) {
    count = Math.max(1, Math.min(50, Math.floor(body.count)));
  }

  return { inputs, count };
}

// ===== Search / filter params =====

export function validateSearchQuery(q: unknown): string | undefined {
  if (q === undefined || q === null) return undefined;
  if (typeof q !== 'string') return undefined;
  const trimmed = q.trim();
  if (trimmed.length > 100) return trimmed.slice(0, 100);
  return trimmed || undefined;
}

export function validateCategoryFilter(cat: unknown): string | undefined {
  if (cat === undefined || cat === null) return undefined;
  if (typeof cat !== 'string') return undefined;
  const trimmed = cat.trim().toLowerCase();
  if (trimmed === 'all' || trimmed === '') return undefined;
  return trimmed;
}

export function validateLimit(raw: unknown, def = 50, max = 200): number {
  if (raw === undefined || raw === null) return def;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(max, Math.floor(n));
}

export function validateOffset(raw: unknown): number {
  if (raw === undefined || raw === null) return 0;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
