import type { PrizeAiFunReward } from '@/lib/types';

export type AiSurpriseKind = 'joke' | 'riddle' | 'fortune';
export type AiSurpriseBody = { kind: AiSurpriseKind; text: string; answer?: string };

const AI_SURPRISE_STOCK_PREFIX = 'levelup:ai-fun-stock:v2';
const AI_SURPRISE_RECENT_PREFIX = 'levelup:ai-fun-recent:v2';
export const AI_SURPRISE_STOCK_TARGET = 3;
export const AI_SURPRISE_STOCK_REFILL_AT = 1;
export const AI_SURPRISE_RECENT_LIMIT = 30;

/** Normalize for dedupe: same joke with different spacing still counts as a repeat. */
export function canonicalAiSurpriseText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function aiSurpriseStockKey(schoolId: string, kind: AiSurpriseKind, ageBand = '0') {
  return `${AI_SURPRISE_STOCK_PREFIX}:${schoolId}:${kind}:${ageBand}`;
}

export function aiSurpriseRecentKey(schoolId: string, kind: AiSurpriseKind, ageBand = '0') {
  return `${AI_SURPRISE_RECENT_PREFIX}:${schoolId}:${kind}:${ageBand}`;
}

export function normalizeAiSurpriseBody(value: unknown, expectedKind: AiSurpriseKind): AiSurpriseBody | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const kind = raw.kind === 'riddle' || raw.kind === 'fortune' || raw.kind === 'joke' ? raw.kind : expectedKind;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text) return null;
  const answer = typeof raw.answer === 'string' && raw.answer.trim() ? raw.answer.trim() : undefined;
  return answer ? { kind, text, answer } : { kind, text };
}

export function readAiSurpriseStock(schoolId: string, kind: AiSurpriseKind, ageBand = '0'): AiSurpriseBody[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(aiSurpriseStockKey(schoolId, kind, ageBand)) || '[]');
    return Array.isArray(parsed)
      ? parsed
          .map((item) => normalizeAiSurpriseBody(item, kind))
          .filter((item): item is AiSurpriseBody => !!item)
      : [];
  } catch {
    return [];
  }
}

export function writeAiSurpriseStock(schoolId: string, kind: AiSurpriseKind, stock: AiSurpriseBody[], ageBand = '0') {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    aiSurpriseStockKey(schoolId, kind, ageBand),
    JSON.stringify(stock.slice(0, AI_SURPRISE_STOCK_TARGET)),
  );
}

export function readRecentAiSurpriseText(schoolId: string, kind: AiSurpriseKind, ageBand = '0'): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(aiSurpriseRecentKey(schoolId, kind, ageBand)) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

/** When API mode is `random`, avoid repeating any recent joke, riddle, or fortune-teller text. */
export function readAllRecentAiSurpriseTexts(schoolId: string, ageBand = '0'): string[] {
  const merged = [
    ...readRecentAiSurpriseText(schoolId, 'joke', ageBand),
    ...readRecentAiSurpriseText(schoolId, 'riddle', ageBand),
    ...readRecentAiSurpriseText(schoolId, 'fortune', ageBand),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of merged) {
    const c = canonicalAiSurpriseText(t);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(t);
  }
  return out;
}

export function rememberAiSurprise(schoolId: string, item: AiSurpriseBody, ageBand = '0') {
  if (typeof window === 'undefined') return;
  const recent = readRecentAiSurpriseText(schoolId, item.kind, ageBand).filter((text) => text !== item.text);
  recent.unshift(item.text);
  window.localStorage.setItem(
    aiSurpriseRecentKey(schoolId, item.kind, ageBand),
    JSON.stringify(recent.slice(0, AI_SURPRISE_RECENT_LIMIT)),
  );
}

export function recentAiSurpriseCanonSet(schoolId: string, kind: AiSurpriseKind, ageBand = '0'): Set<string> {
  return new Set(readRecentAiSurpriseText(schoolId, kind, ageBand).map(canonicalAiSurpriseText));
}

/** Lines the model must not repeat (trimmed, deduped, capped for JSON body size). */
export function buildPrizeAiFunAvoidTexts(
  schoolId: string,
  apiMode: PrizeAiFunReward,
  extras?: readonly string[],
  cap = 18,
  ageBand = '0',
): string[] {
  const base =
    apiMode === 'random'
      ? readAllRecentAiSurpriseTexts(schoolId, ageBand)
      : apiMode === 'joke' || apiMode === 'riddle' || apiMode === 'fortune'
        ? readRecentAiSurpriseText(schoolId, apiMode, ageBand)
        : readRecentAiSurpriseText(schoolId, 'joke', ageBand);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string | undefined) => {
    const t = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
    if (t.length < 4) return;
    const c = canonicalAiSurpriseText(t);
    if (seen.has(c)) return;
    seen.add(c);
    out.push(t.slice(0, 280));
  };
  for (const t of base) push(t);
  if (extras) for (const t of extras) push(t);
  return out.slice(0, cap);
}

export function isAiSurpriseTextRecentlySeen(
  schoolId: string,
  kind: AiSurpriseKind,
  text: string,
  ageBand = '0',
): boolean {
  const c = canonicalAiSurpriseText(text);
  if (!c) return false;
  return recentAiSurpriseCanonSet(schoolId, kind, ageBand).has(c);
}
