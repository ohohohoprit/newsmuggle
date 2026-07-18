import type { GenerateResponse } from './tool-prompts';

export async function generateContent(
  toolId: string,
  inputs: Record<string, string>,
  count: number = 5,
  signal?: AbortSignal,
): Promise<GenerateResponse> {
  const res = await fetch(`/api/tools/${toolId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...inputs, count }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Request failed');
    if (res.status === 401) {
      throw new Error('Please log in to generate content.');
    }
    if (res.status === 429) {
      throw new Error('Monthly generation limit reached. Upgrade your plan to continue.');
    }
    throw new Error(`Generate failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  const result = json.result ?? json;
  return {
    toolId,
    items: result.items ?? [],
    summary: result.summary ?? '',
    metrics: result.metrics ?? { curiosity: 0, specificity: 0, benefitDriven: 0, emotionalImpact: 0 },
  } as GenerateResponse;
}
