/** Shared detection for paid LLM provider failures (quota, overload, auth). */

export function isLlmProviderFailure(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /429|503|401|403|404|quota|high demand|not found|API key not valid|invalid api key|leaked|PERMISSION_DENIED|permission denied|billing|payment required|insufficient|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(
    msg,
  );
}

export function userFacingLlmError(e: unknown, context = 'generate the theme'): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
    return `Google Gemini quota is exceeded, so we could not ${context}. Try GPT-4o-mini in the model dropdown, or retry later.`;
  }
  if (/503|high demand|UNAVAILABLE/i.test(msg)) {
    return `Gemini is temporarily overloaded. Wait a minute, switch to GPT-4o-mini, or try Gemini 2.5 Flash-Lite.`;
  }
  if (/401|403|API key|PERMISSION_DENIED|permission denied/i.test(msg)) {
    return 'The AI service is not correctly configured on the server. Ask your tech contact to check the Gemini API key.';
  }
  if (msg.trim()) return msg.slice(0, 240);
  return `Could not ${context}. Please try again.`;
}

/** When a Gemini model fails, try these alternates before OpenAI fallback. */
export const GEMINI_MODEL_FALLBACK_CHAIN: Record<string, string[]> = {
  'gemini-2.5-pro': ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  'gemini-2.5-flash': ['gemini-2.5-flash-lite'],
  'gemini-2.0-flash': ['gemini-2.5-flash-lite', 'gemini-2.5-flash'],
  'gemini-2.0-flash-lite': ['gemini-2.5-flash-lite'],
};

export function geminiModelAttemptOrder(selectedModel: string): string[] {
  const extras = GEMINI_MODEL_FALLBACK_CHAIN[selectedModel] ?? [];
  return [...new Set([selectedModel, ...extras])];
}
