/**
 * OpenAI provider — uses the official OpenAI Chat Completions REST API.
 *
 * This provider is also the base for OpenAI-compatible providers (Grok,
 * DeepSeek) which only differ by baseURL and model list. Those providers
 * extend this class and override `baseURL` + `models`.
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

interface OpenAIChoice {
  message?: { content?: string };
  finish_reason?: string;
}
interface OpenAIResponse {
  choices?: OpenAIChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export class OpenAIProvider extends BaseAIProvider {
  readonly slug: AIProviderSlug = 'openai';
  readonly name: string = 'OpenAI';
  protected readonly apiKeyEnvVar: string = 'OPENAI_API_KEY';
  protected readonly defaultModelId: string = 'gpt-4o-mini';

  /** Base URL for the OpenAI-compatible API. Override in subclasses. */
  protected get baseURL(): string {
    return process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  }

  protected readonly models: AIModelInfo[] = [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o mini',
      promptCostPer1k: 0.00015,
      completionCostPer1k: 0.0006,
      contextWindow: 128_000,
      supportsStreaming: true,
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      promptCostPer1k: 0.0025,
      completionCostPer1k: 0.01,
      contextWindow: 128_000,
      supportsStreaming: true,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      promptCostPer1k: 0.01,
      completionCostPer1k: 0.03,
      contextWindow: 128_000,
      supportsStreaming: true,
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      promptCostPer1k: 0.0005,
      completionCostPer1k: 0.0015,
      contextWindow: 16_385,
      supportsStreaming: true,
    },
  ];

  async generate(req: AIGenerateRequest, opts: AICallOptions): Promise<AIGenerateResponse> {
    this.requireAvailable();

    const model = this.resolveModel(req.model);
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const { signal, cleanup } = this.createTimeout(timeoutMs, opts.signal);

    const startedAt = Date.now();
    try {
      const messages = this.buildMessages(req);
      const body: Record<string, unknown> = {
        model: req.model && req.model !== 'default' ? req.model : this.defaultModelId,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: req.temperature ?? 0.8,
      };
      if (req.maxTokens) body.max_tokens = req.maxTokens;
      if (req.stop) body.stop = req.stop;

      const res = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw { status: res.status, message: errText || `OpenAI returned status ${res.status}` };
      }

      const data = (await res.json()) as OpenAIResponse;
      const content = data.choices?.[0]?.message?.content ?? '';
      const finishReason = data.choices?.[0]?.finish_reason;

      let usage: AIUsage;
      if (data.usage && (data.usage.prompt_tokens || data.usage.completion_tokens)) {
        usage = {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? (data.usage.prompt_tokens ?? 0) + (data.usage.completion_tokens ?? 0),
        };
      } else {
        usage = estimateUsage(messages, content);
      }

      const latencyMs = Date.now() - startedAt;
      const cost = calculateCost(usage, model);

      return {
        content,
        provider: this.slug,
        model: body.model as string,
        latencyMs,
        usage,
        cost,
        finishReason,
        retries: 0,
      };
    } catch (err) {
      throw normalizeError(err, this.slug, req.model ?? this.defaultModelId);
    } finally {
      cleanup();
    }
  }
}
