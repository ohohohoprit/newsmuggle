/**
 * Claude (Anthropic) provider — uses the Anthropic Messages API.
 *
 * Anthropic's API differs from OpenAI's:
 *  - System prompt is a top-level field, not a message
 *  - Model param is required
 *  - Usage shape: { input_tokens, output_tokens }
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

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export class ClaudeProvider extends BaseAIProvider {
  readonly slug: AIProviderSlug = 'claude';
  readonly name = 'Claude (Anthropic)';
  protected readonly apiKeyEnvVar = 'ANTHROPIC_API_KEY';
  protected readonly defaultModelId = 'claude-3-5-sonnet-20241022';

  protected get baseURL(): string {
    return process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com';
  }

  protected readonly models: AIModelInfo[] = [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      promptCostPer1k: 0.003,
      completionCostPer1k: 0.015,
      contextWindow: 200_000,
      supportsStreaming: true,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      promptCostPer1k: 0.0008,
      completionCostPer1k: 0.004,
      contextWindow: 200_000,
      supportsStreaming: true,
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      promptCostPer1k: 0.015,
      completionCostPer1k: 0.075,
      contextWindow: 200_000,
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
      // Extract system prompt — Anthropic uses a top-level system field
      const allMessages = this.buildMessages(req);
      let systemPrompt = req.system ?? '';
      const messages = allMessages.filter((m) => {
        if (m.role === 'system') {
          systemPrompt = systemPrompt ? `${systemPrompt}\n\n${m.content}` : m.content;
          return false;
        }
        return true;
      });

      const body: Record<string, unknown> = {
        model: modelId,
        max_tokens: req.maxTokens ?? 4096,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: req.temperature ?? 0.8,
      };
      if (systemPrompt) body.system = systemPrompt;
      if (req.stop) body.stop_sequences = req.stop;

      const res = await fetch(`${this.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.getApiKey()!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw { status: res.status, message: errText || `Anthropic returned status ${res.status}` };
      }

      const data = (await res.json()) as AnthropicResponse;
      const content = data.content?.map((c) => c.text ?? '').join('') ?? '';
      const finishReason = data.stop_reason;

      let usage: AIUsage;
      if (data.usage && (data.usage.input_tokens || data.usage.output_tokens)) {
        usage = {
          promptTokens: data.usage.input_tokens ?? 0,
          completionTokens: data.usage.output_tokens ?? 0,
          totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
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
