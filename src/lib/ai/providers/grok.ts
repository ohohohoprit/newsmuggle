/**
 * Grok (xAI) provider — OpenAI-compatible API.
 *
 * xAI's API mirrors the OpenAI Chat Completions format, so this class
 * just overrides the baseURL, model list, and env var name.
 */
import type { AIProviderSlug, AIModelInfo } from '@/lib/ai/types';
import { OpenAIProvider } from '@/lib/ai/providers/openai';

export class GrokProvider extends OpenAIProvider {
  override readonly slug: AIProviderSlug = 'grok';
  override readonly name = 'Grok (xAI)';
  protected override readonly apiKeyEnvVar = 'XAI_API_KEY';
  protected override readonly defaultModelId = 'grok-2-latest';

  protected override get baseURL(): string {
    return process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1';
  }

  protected override readonly models: AIModelInfo[] = [
    {
      id: 'grok-2-latest',
      name: 'Grok 2 (latest)',
      promptCostPer1k: 0.002,
      completionCostPer1k: 0.01,
      contextWindow: 131_072,
      supportsStreaming: true,
    },
    {
      id: 'grok-2-mini',
      name: 'Grok 2 Mini',
      promptCostPer1k: 0.001,
      completionCostPer1k: 0.004,
      contextWindow: 131_072,
      supportsStreaming: true,
    },
    {
      id: 'grok-beta',
      name: 'Grok Beta',
      promptCostPer1k: 0.005,
      completionCostPer1k: 0.015,
      contextWindow: 131_072,
      supportsStreaming: true,
    },
  ];
}
