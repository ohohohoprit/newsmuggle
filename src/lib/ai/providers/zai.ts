/**
 * ZAI provider — the default provider in this project.
 *
 * Uses the z-ai-web-dev-sdk which is already a dependency. This is the
 * only provider with a real SDK call wired in this environment; the other
 * providers use the OpenAI-compatible REST API (fetch) so they can be
 * enabled simply by setting their API key env var.
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
import { normalizeError, AIUnavailableError } from '@/lib/ai/errors';
import { estimateUsage } from '@/lib/ai/metrics';

export class ZAIProvider extends BaseAIProvider {
  readonly slug: AIProviderSlug = 'zai';
  readonly name = 'ZAI';
  protected readonly apiKeyEnvVar = 'ZAI_API_KEY';
  protected readonly defaultModelId = 'glm-4.6';

  /**
   * ZAI availability depends on the ZAI_API_KEY env var being set,
   * just like every other provider. In the sandbox environment the key
   * is provided automatically; outside the sandbox ZAI won't work.
   */

  protected readonly models: AIModelInfo[] = [
    {
      id: 'glm-4.6',
      name: 'GLM-4.6 (default)',
      promptCostPer1k: 0,
      completionCostPer1k: 0,
      contextWindow: 128_000,
      supportsStreaming: true,
    },
    {
      id: 'glm-4.5',
      name: 'GLM-4.5',
      promptCostPer1k: 0,
      completionCostPer1k: 0,
      contextWindow: 128_000,
      supportsStreaming: true,
    },
    {
      id: 'default',
      name: 'Default (alias for GLM-4.6)',
      promptCostPer1k: 0,
      completionCostPer1k: 0,
      contextWindow: 128_000,
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
      // Dynamic import so the SDK is only loaded when ZAI is actually used
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const messages = this.buildMessages(req);

      // ZAI SDK uses OpenAI-compatible shape
      const completion = await zai.chat.completions.create({
        model: modelId,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: req.temperature ?? 0.8,
        ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
        ...(req.stop ? { stop: req.stop } : {}),
        thinking: { type: req.thinkingEnabled ? 'enabled' : 'disabled' },
      });

      const content = completion.choices[0]?.message?.content ?? '';
      const finishReason = completion.choices[0]?.finish_reason;

      // Extract usage if the SDK returns it
      let usage: AIUsage;
      const rawUsage = (completion as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }).usage;
      if (rawUsage && (rawUsage.prompt_tokens || rawUsage.completion_tokens)) {
        usage = {
          promptTokens: rawUsage.prompt_tokens ?? 0,
          completionTokens: rawUsage.completion_tokens ?? 0,
          totalTokens: rawUsage.total_tokens ?? (rawUsage.prompt_tokens ?? 0) + (rawUsage.completion_tokens ?? 0),
        };
      } else {
        // Fallback: estimate from text length
        usage = estimateUsage(messages, content);
      }

      const latencyMs = Date.now() - startedAt;
      const cost = { usd: 0, promptPer1k: model.promptCostPer1k, completionPer1k: model.completionCostPer1k };

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
