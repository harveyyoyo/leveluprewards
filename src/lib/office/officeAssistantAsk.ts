'use client';

import { useSyncExternalStore } from 'react';

/**
 * Lets the ask boxes (the big one on Home, the small one in the header) hand a question to the
 * assistant, which answers right under the box. Everything stays in the browser.
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

/** Where the answer shows: under Home's big box, or under the header's small one. */
export type OfficeAnswerSpot = 'home' | 'header';

const answerSpots: Record<OfficeAnswerSpot, HTMLElement | null> = { home: null, header: null };
const spotListeners = new Set<() => void>();

/** Ask box side: `ref={(el) => setOfficeAnswerSpot('home', el)}`. */
export function setOfficeAnswerSpot(spot: OfficeAnswerSpot, el: HTMLElement | null) {
  if (answerSpots[spot] === el) return;
  answerSpots[spot] = el;
  spotListeners.forEach((l) => l());
}

export function useOfficeAnswerSpot(spot: OfficeAnswerSpot): HTMLElement | null {
  return useSyncExternalStore(
    (l) => {
      spotListeners.add(l);
      return () => spotListeners.delete(l);
    },
    () => answerSpots[spot],
    () => null,
  );
}
