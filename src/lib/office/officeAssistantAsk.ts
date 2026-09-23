'use client';

/**
 * Lets the big "Ask a question" box on the office Home page hand a question to Help, which
 * opens on its Ask tab and answers it. Everything stays in the browser.
 */

const EVENT = 'office-assistant-ask';

export function askOfficeAssistant(question: string) {
  const text = question.trim();
  if (!text || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: text }));
}

export function subscribeOfficeAssistantAsk(listener: (question: string) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
