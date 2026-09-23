'use client';

import { useEffect, useRef } from 'react';

/**
 * When Help → Ask opens a list, the page that shows it reports back what it found, so the chat can
 * answer with the same results that are on screen ("9 families: Adams $1,950 …"). Everything stays
 * in the browser — nothing here is sent to the AI.
 */

export type OfficeAssistantResultRow = { id: string; name: string; detail?: string };

type Report =
  | { status: 'ready'; total: number; noun: readonly [string, string]; rows: OfficeAssistantResultRow[] }
  | { status: 'unavailable'; message: string };

export type OfficeAssistantResults = Report & { askAt: string };

/** How many names the chat lists before saying "and N more". */
export const OFFICE_ASSISTANT_CHAT_ROWS = 8;

const EVENT = 'office-assistant-results';
const latest = new Map<string, OfficeAssistantResults>();

export function publishOfficeAssistantResults(results: OfficeAssistantResults) {
  latest.set(results.askAt, results);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: results }));
}

/** Results already reported for a question (in case they arrived before the chat listened). */
export function readOfficeAssistantResults(askAt: string): OfficeAssistantResults | null {
  return latest.get(askAt) ?? null;
}

export function subscribeOfficeAssistantResults(listener: (results: OfficeAssistantResults) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<OfficeAssistantResults>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** How long a page must stay loaded before it reports (a new day's list can look "loaded" for one moment). */
const SETTLE_MS = 400;

/**
 * Page side: reports once per question, after the page has applied the question's filters and
 * stayed loaded for a moment. `askAt` should be set in the same update as the filters.
 */
export function useReportOfficeAssistantResults(askAt: string | null, ready: boolean, build: () => Report) {
  const reported = useRef<string | null>(null);
  const buildRef = useRef(build);
  buildRef.current = build;
  useEffect(() => {
    if (!askAt || !ready || reported.current === askAt) return;
    const timer = window.setTimeout(() => {
      reported.current = askAt;
      publishOfficeAssistantResults({ ...buildRef.current(), askAt });
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [askAt, ready]);
}

/** "9 families", "1 student", "no students". */
export function countLabel(total: number, noun: readonly [string, string]): string {
  if (total === 0) return `no ${noun[1]}`;
  return `${total} ${total === 1 ? noun[0] : noun[1]}`;
}
