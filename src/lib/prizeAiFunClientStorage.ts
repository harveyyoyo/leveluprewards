import type { PrizeAiFunReward } from '@/lib/types';
import { acrosticTraitFingerprint } from '@/lib/prizeAiFunAcrostic';

export type AiSurpriseKind = 'joke' | 'riddle' | 'fortune' | 'acrostic';
export type AiSurpriseBody = { kind: AiSurpriseKind; text: string; answer?: string };

const AI_SURPRISE_STOCK_PREFIX = 'levelup:ai-fun-stock:v2';
/** v3: recent entries store text + optional answer (answer feeds API avoid-list; dedupe uses normalized text). */
const AI_SURPRISE_RECENT_PREFIX = 'levelup:ai-fun-recent:v3';
export const AI_SURPRISE_STOCK_TARGET = 3;
export const AI_SURPRISE_STOCK_REFILL_AT = 1;
export const AI_SURPRISE_RECENT_LIMIT = 30;

export type RecentSurpriseEntry = { text: string; answer?: string };

/** Normalize for dedupe: same joke with different spacing still counts as a repeat. */
export function canonicalAiSurpriseText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Fingerprint for “already seen” checks. Punctuation/case-insensitive.
 * Riddles: keyed by the riddle text only (same puzzle = duplicate even if answers differed).
 */
export function aiSurpriseDedupeKey(kind: AiSurpriseKind, text: string): string {
  const squash = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
  const t = squash(text).slice(0, 140);
  if (kind === 'riddle') return `r|${t}`;
  if (kind === 'fortune') return `f|${t}`;
  if (kind === 'acrostic') {
    const traits = acrosticTraitFingerprint(text);
    return traits ? `a|${traits}` : `a|${t}`;
  }
  return `j|${t}`;
}

function dedupeStockBodies(items: AiSurpriseBody[]): AiSurpriseBody[] {
  const seen = new Set<string>();
  const out: AiSurpriseBody[] = [];
  for (const item of items) {
    const k = aiSurpriseDedupeKey(item.kind, item.text);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/** One line for the model’s avoid-list (riddles include answer so paraphrases of the same puzzle are caught). */
export function avoidLineForRecentEntry(entry: RecentSurpriseEntry, kind: AiSurpriseKind): string {
  const text = entry.text.replace(/\s+/g, ' ').trim();
  if (kind === 'riddle' && entry.answer?.trim()) {
    const a = entry.answer.replace(/\s+/g, ' ').trim();
    return `${text.slice(0, 220)} — Answer: ${a.slice(0, 100)}`.slice(0, 280);
  }
  return text.slice(0, 280);
}

function parseRecentEntries(raw: unknown, kind: AiSurpriseKind): RecentSurpriseEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: RecentSurpriseEntry[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const t = item.trim();
      if (t) out.push({ text: t });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const text = typeof o.text === 'string' ? o.text.trim() : '';
    if (!text) continue;
    const answer =
      kind === 'riddle' && typeof o.answer === 'string' && o.answer.trim() ? o.answer.trim() : undefined;
    out.push(answer ? { text, answer } : { text });
  }
  return out;
}

export function readRecentSurpriseEntries(
  schoolId: string,
  kind: AiSurpriseKind,
  ageBand = '0',
): RecentSurpriseEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(aiSurpriseRecentKey(schoolId, kind, ageBand)) || '[]');
    return parseRecentEntries(parsed, kind);
  } catch {
    return [];
  }
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
  const kind =
    raw.kind === 'riddle' || raw.kind === 'fortune' || raw.kind === 'joke' || raw.kind === 'acrostic'
      ? raw.kind
      : expectedKind;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text) return null;
  const answer = typeof raw.answer === 'string' && raw.answer.trim() ? raw.answer.trim() : undefined;
  return answer ? { kind, text, answer } : { kind, text };
}

export function readAiSurpriseStock(schoolId: string, kind: AiSurpriseKind, ageBand = '0'): AiSurpriseBody[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(aiSurpriseStockKey(schoolId, kind, ageBand)) || '[]');
    const list = Array.isArray(parsed)
      ? parsed
          .map((item) => normalizeAiSurpriseBody(item, kind))
          .filter((item): item is AiSurpriseBody => !!item)
      : [];
    return dedupeStockBodies(list);
  } catch {
    return [];
  }
}

export function writeAiSurpriseStock(schoolId: string, kind: AiSurpriseKind, stock: AiSurpriseBody[], ageBand = '0') {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    aiSurpriseStockKey(schoolId, kind, ageBand),
    JSON.stringify(dedupeStockBodies(stock).slice(0, AI_SURPRISE_STOCK_TARGET)),
  );
}

/** Text lines (and riddle+answer summaries) sent to the API as avoidTexts. */
export function readRecentAiSurpriseText(schoolId: string, kind: AiSurpriseKind, ageBand = '0'): string[] {
  return readRecentSurpriseEntries(schoolId, kind, ageBand).map((e) => avoidLineForRecentEntry(e, kind));
}

/** When API mode is `random`, avoid repeating any recent joke, riddle, or fortune-teller text. */
export function readAllRecentAiSurpriseTexts(schoolId: string, ageBand = '0'): string[] {
  const merged = [
    ...readRecentAiSurpriseText(schoolId, 'joke', ageBand),
    ...readRecentAiSurpriseText(schoolId, 'riddle', ageBand),
    ...readRecentAiSurpriseText(schoolId, 'fortune', ageBand),
    ...readRecentAiSurpriseText(schoolId, 'acrostic', ageBand),
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
  const kind = item.kind;
  const newKey = aiSurpriseDedupeKey(kind, item.text);
  const prev = readRecentSurpriseEntries(schoolId, kind, ageBand).filter(
    (e) => aiSurpriseDedupeKey(kind, e.text) !== newKey,
  );
  const entry: RecentSurpriseEntry =
    kind === 'riddle' && item.answer
      ? { text: item.text, answer: item.answer }
      : { text: item.text };
  prev.unshift(entry);
  window.localStorage.setItem(
    aiSurpriseRecentKey(schoolId, kind, ageBand),
    JSON.stringify(prev.slice(0, AI_SURPRISE_RECENT_LIMIT)),
  );
}

export function recentAiSurpriseDedupeSet(schoolId: string, kind: AiSurpriseKind, ageBand = '0'): Set<string> {
  return new Set(
    readRecentSurpriseEntries(schoolId, kind, ageBand).map((e) => aiSurpriseDedupeKey(kind, e.text)),
  );
}

/** @deprecated use recentAiSurpriseDedupeSet */
export function recentAiSurpriseCanonSet(schoolId: string, kind: AiSurpriseKind, ageBand = '0'): Set<string> {
  return recentAiSurpriseDedupeSet(schoolId, kind, ageBand);
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
      : apiMode === 'joke' || apiMode === 'riddle' || apiMode === 'fortune' || apiMode === 'acrostic'
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
  return recentAiSurpriseDedupeSet(schoolId, kind, ageBand).has(aiSurpriseDedupeKey(kind, text));
}

const AI_SURPRISE_ALL_KINDS: AiSurpriseKind[] = ['joke', 'riddle', 'fortune', 'acrostic'];
const AI_SURPRISE_ALL_AGE_BANDS = ['0', '1', '2', '3', '4'] as const;

/** Wipe prefetch + recent lines for this school (all age bands). Call after birthday / age signal changes. */
export function clearPrizeAiFunSchoolClientCache(schoolId: string) {
  if (typeof window === 'undefined' || !schoolId) return;
  for (const kind of AI_SURPRISE_ALL_KINDS) {
    for (const band of AI_SURPRISE_ALL_AGE_BANDS) {
      window.localStorage.removeItem(aiSurpriseStockKey(schoolId, kind, band));
      window.localStorage.removeItem(aiSurpriseRecentKey(schoolId, kind, band));
    }
  }
}
