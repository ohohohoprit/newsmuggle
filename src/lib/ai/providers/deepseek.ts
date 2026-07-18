/**
 * DeepSeek provider — OpenAI-compatible API.
 *
 * DeepSeek's API mirrors the OpenAI Chat Completions format, so this
 * class just overrides the baseURL, model list, and env var name.
 */
import type { AIProviderSlug, AIModelInfo } from '@/lib/ai/types';
import { OpenAIProvider } from '@/lib/ai/providers/openai';

export class DeepSeekProvider extends OpenAIProvider {
  override readonly slug: AIProviderSlug = 'deepseek';
  override readonly name = 'DeepSeek';
  protected override readonly apiKeyEnvVar = 'DEEPSEEK_API_KEY';
  protected override readonly defaultModelId = 'deepseek-chat';

  protected override get baseURL(): string {
    return process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1';
  }

  protected override readonly models: AIModelInfo[] = [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek V3 (chat)',
      promptCostPer1k: 0.00027,
      completionCostPer1k: 0.0011,
      contextWindow: 64_000,
      supportsStreaming: true,
    },
    {
      id: 'deepseek-reasoner',
      name: 'DeepSeek R1 (reasoner)',
      promptCostPer1k: 0.00055,
      completionCostPer1k: 0.0022,
      contextWindow: 64_000,
      supportsStreaming: true,
    },
  ];
}
