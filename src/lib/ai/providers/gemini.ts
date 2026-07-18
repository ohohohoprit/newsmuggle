/**
 * Gemini (Google) provider — uses the Generative Language API.
 *
 * Gemini's API differs from OpenAI's:
 *  - Endpoint includes the model name + API key as query param
 *  - Request body uses `contents` with `parts` (not `messages`)
 *  - System instruction is a separate field
 *  - Usage shape: { promptTokenCount, candidatesTokenCount, totalTokenCount }
 */
import type {
  AIGenerateRequest,
  AIGenerateResponse,
  AICallOptions,
  AIProviderSlug,
  AIModelInfo,
  AIUsage,
} from '@/lib/ai/types';
import { BaseAIProvider } from '@/lib/ai/providers/base';
import { normalizeError } from '@/lib/ai/errors';
import { estimateUsage, calculateCost } from '@/lib/ai/metrics';

interface GeminiPart {
  text: string;
}
interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  promptFeedback?: { blockReason?: string };
}

export class GeminiProvider extends BaseAIProvider {
  readonly slug: AIProviderSlug = 'gemini';
  readonly name = 'Gemini (Google)';
  protected readonly apiKeyEnvVar = 'GEMINI_API_KEY';
  protected readonly defaultModelId = 'gemini-3.1-flash-lite';

  protected get baseURL(): string {
    return process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta';
  }

  protected readonly models: AIModelInfo[] = [
    {
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      promptCostPer1k: 0.0,
      completionCostPer1k: 0.0,
      contextWindow: 1_048_576,
      supportsStreaming: true,
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      promptCostPer1k: 0.0001,
      completionCostPer1k: 0.0004,
      contextWindow: 1_048_576,
      supportsStreaming: true,
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash Lite',
      promptCostPer1k: 0.0,
      completionCostPer1k: 0.0,
      contextWindow: 1_048_576,
      supportsStreaming: true,
    },
  ];

  async generate(req: AIGenerateRequest, opts: AICallOptions): Promise<AIGenerateResponse> {
    this.requireAvailable();

    const model = this.resolveModel(req.model);
    const modelId = req.model && req.model !== 'default' ? req.model : this.defaultModelId;
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const { signal, cleanup } = this.createTimeout(timeoutMs, opts.signal);

    const startedAt = Date.now();
    try {
      const allMessages = this.buildMessages(req);
      let systemPrompt = req.system ?? '';
      const contents: GeminiContent[] = [];
      for (const m of allMessages) {
        if (m.role === 'system') {
          systemPrompt = systemPrompt ? `${systemPrompt}\n\n${m.content}` : m.content;
          continue;
        }
        // Gemini uses 'user' and 'model' roles
        const role = m.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: m.content }] });
      }

      const body: Record<string, unknown> = {
        contents,
        generationConfig: {
          temperature: req.temperature ?? 0.8,
          ...(req.maxTokens ? { maxOutputTokens: req.maxTokens } : {}),
          ...(req.stop ? { stopSequences: req.stop } : {}),
        },
      };
      if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const url = `${this.baseURL}/models/${modelId}:generateContent?key=${this.getApiKey()}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw { status: res.status, message: errText || `Gemini returned status ${res.status}` };
      }

      const data = (await res.json()) as GeminiResponse;

      // Safety block check
      if (data.promptFeedback?.blockReason) {
        throw { status: 400, message: `Content blocked: ${data.promptFeedback.blockReason}` };
      }

      const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
      const finishReason = data.candidates?.[0]?.finishReason;

      let usage: AIUsage;
      if (data.usageMetadata) {
        usage = {
          promptTokens: data.usageMetadata.promptTokenCount ?? 0,
          completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
          totalTokens: data.usageMetadata.totalTokenCount ?? 0,
        };
      } else {
        usage = estimateUsage(this.buildMessages(req), content);
      }

      const latencyMs = Date.now() - startedAt;
      const cost = calculateCost(usage, model);

      return {
        content,
        provider: this.slug,
        model: modelId,
        latencyMs,
        usage,
        cost,
        finishReason,
        retries: 0,
      };
    } catch (err) {
      throw normalizeError(err, this.slug, modelId);
    } finally {
      cleanup();
    }
  }
}
