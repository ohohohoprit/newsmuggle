/**
 * Client-side helper for calling /api/generate.
 * Used by HookGeneratorPage and ToolModal.
 */
import type { GenerateRequest, GenerateResponse } from './tool-prompts';

export async function generateContent(
  toolId: string,
  inputs: Record<string, string>,
  count: number = 5,
  signal?: AbortSignal,
): Promise<GenerateResponse> {
  const body: GenerateRequest = { toolId, inputs, count };
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Request failed');
    throw new Error(`Generate failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GenerateResponse;
}
