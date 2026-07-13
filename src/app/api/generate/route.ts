import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import {
  getToolPrompt,
  type GenerateRequest,
  type GenerateResponse,
  type GeneratedItem,
} from '@/smuggler/lib/tool-prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface RawItem {
  text?: unknown;
  score?: unknown;
  rationale?: unknown;
}

interface RawResponse {
  items?: unknown;
  summary?: unknown;
  metrics?: unknown;
}

/** Fallback generator used if the LLM call fails or returns unparseable JSON. */
function fallbackItems(toolId: string, count: number, topic: string): GeneratedItem[] {
  const templates = [
    { text: `The ${toolId.replace(/-/g, ' ')} secret behind ${topic}: what nobody tells you`, score: 88 },
    { text: `Stop wasting time on ${topic}. Do this instead.`, score: 85 },
    { text: `I tried everything for ${topic}. Here's what actually works.`, score: 82 },
    { text: `The 5-minute ${topic} trick that changed everything`, score: 84 },
    { text: `Why 99% of people get ${topic} wrong (and how to fix it)`, score: 86 },
    { text: `The truth about ${topic} that experts won't share`, score: 80 },
    { text: `How I mastered ${topic} in 30 days (and you can too)`, score: 78 },
    { text: `${topic}: the complete beginner's guide`, score: 75 },
    { text: `The hidden cost of ignoring ${topic}`, score: 83 },
    { text: `${topic} explained in under 60 seconds`, score: 79 },
    { text: `The ${topic} framework top creators use`, score: 81 },
    { text: `What if everything you knew about ${topic} was wrong?`, score: 87 },
    { text: `The ultimate ${topic} checklist (save this)`, score: 77 },
    { text: `${topic}: before vs after`, score: 74 },
    { text: `The science of ${topic}, simplified`, score: 76 },
    { text: `Stop doing ${topic} like a beginner`, score: 80 },
    { text: `The ${topic} mistake costing you 10 hours a week`, score: 89 },
    { text: `${topic} for people who hate ${topic}`, score: 73 },
    { text: `The lazy creator's guide to ${topic}`, score: 78 },
    { text: `${topic}: a 2025 reality check`, score: 75 },
  ];
  const picked = templates.slice(0, Math.min(count, templates.length));
  return picked.map((t) => ({
    text: t.text,
    score: t.score,
    rationale: 'Curiosity-driven opening that promises clear value to the reader.',
  }));
}

/** Robust JSON extractor — handles markdown fences, leading/trailing prose. */
function extractJson(raw: string): RawResponse | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  try {
    return JSON.parse(cleaned) as RawResponse;
  } catch {
    // fall through
  }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as RawResponse;
  } catch {
    return null;
  }
}

function sanitizeItems(raw: RawResponse | null, count: number, toolId: string, topic: string): GeneratedItem[] {
  if (!raw || !Array.isArray(raw.items)) {
    return fallbackItems(toolId, count, topic);
  }
  const items: GeneratedItem[] = [];
  for (const r of raw.items as unknown[]) {
    if (!r || typeof r !== 'object') continue;
    const item = r as RawItem;
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (!text) continue;
    let score = typeof item.score === 'number' ? item.score : 80;
    if (!Number.isFinite(score)) score = 80;
    score = Math.max(50, Math.min(100, Math.round(score)));
    const rationale =
      typeof item.rationale === 'string' && item.rationale.trim()
        ? item.rationale.trim()
        : 'Strong opening that promises value and creates curiosity.';
    items.push({ text, score, rationale });
  }
  if (items.length === 0) return fallbackItems(toolId, count, topic);
  return items.slice(0, count);
}

function sanitizeMetrics(raw: RawResponse | null) {
  const fallback = { curiosity: 8.5, specificity: 8.0, benefitDriven: 9.0, emotionalImpact: 8.0 };
  if (!raw || typeof raw.metrics !== 'object' || !raw.metrics) return fallback;
  const m = raw.metrics as Record<string, unknown>;
  const clamp = (v: unknown, dflt: number) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (!Number.isFinite(n)) return dflt;
    return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
  };
  return {
    curiosity: clamp(m.curiosity, 8.5),
    specificity: clamp(m.specificity, 8.0),
    benefitDriven: clamp(m.benefitDriven ?? m.benefit_driven, 9.0),
    emotionalImpact: clamp(m.emotionalImpact ?? m.emotional_impact, 8.0),
  };
}

export async function POST(request: Request) {
  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { toolId, inputs, count } = body;
  if (!toolId || typeof toolId !== 'string') {
    return NextResponse.json({ error: 'toolId is required' }, { status: 400 });
  }
  if (!inputs || typeof inputs !== 'object') {
    return NextResponse.json({ error: 'inputs object is required' }, { status: 400 });
  }

  const n = Math.max(1, Math.min(20, count ?? 5));
  const config = getToolPrompt(toolId);
  const topic = inputs.content || inputs.topic || 'your topic';

  let items: GeneratedItem[] = [];
  let summary = `This set of results creates curiosity by highlighting a big benefit and sets up a promise of valuable, actionable tips.`;
  let metrics = { curiosity: 8.5, specificity: 8.0, benefitDriven: 9.0, emotionalImpact: 8.0 };

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: config.system },
        { role: 'user', content: config.buildUserMessage(inputs, n) },
      ],
      thinking: { type: 'disabled' },
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const parsed = extractJson(content);

    items = sanitizeItems(parsed, n, toolId, topic);

    if (parsed && typeof parsed.summary === 'string' && parsed.summary.trim()) {
      summary = parsed.summary.trim();
    } else {
      // Try to extract summary from raw content via regex
      const summaryMatch = content.match(/"summary"\s*:\s*"([^"]+)"/);
      if (summaryMatch && summaryMatch[1].trim()) {
        summary = summaryMatch[1].trim();
      }
    }
    metrics = sanitizeMetrics(parsed);

    if (items.length < n) {
      const fallback = fallbackItems(toolId, n, topic);
      const existingTexts = new Set(items.map((i) => i.text.toLowerCase()));
      for (const f of fallback) {
        if (items.length >= n) break;
        if (!existingTexts.has(f.text.toLowerCase())) {
          items.push(f);
          existingTexts.add(f.text.toLowerCase());
        }
      }
    }
  } catch (err) {
    console.error('[/api/generate] LLM call failed:', err);
    items = fallbackItems(toolId, n, topic);
  }

  const response: GenerateResponse = {
    toolId,
    items,
    summary,
    metrics,
  };

  return NextResponse.json(response);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/generate',
    method: 'POST',
    body: { toolId: 'string', inputs: 'Record<string,string>', count: 'number (1-20, default 5)' },
  });
}
