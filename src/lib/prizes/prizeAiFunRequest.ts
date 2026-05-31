import type { PrizeAiFunSurpriseRequestMode } from '@/lib/aiJokePrize';
import {
  aiSurpriseDedupeKey,
  buildPrizeAiFunAvoidTexts,
  normalizeAiSurpriseBody,
  recentAiSurpriseDedupeSet,
  type AiSurpriseBody,
  type AiSurpriseKind,
} from '@/lib/prizes/prizeAiFunClientStorage';
import { buildFallbackAcrostic, lettersForAcrosticName } from '@/lib/prizes/prizeAiFunAcrostic';

export type PrizeAiFunFetchAuth = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function requestPrizeAiFunSurprise(
  authFetch: PrizeAiFunFetchAuth,
  opts: {
    schoolId: string;
    mode: PrizeAiFunSurpriseRequestMode;
    ageBand?: string;
    ageYears?: number;
    firstName?: string;
    extraAvoid?: readonly string[];
    signal?: AbortSignal;
  },
): Promise<AiSurpriseBody | null> {
  const ageBand = opts.ageBand ?? '0';
  const kind: AiSurpriseKind =
    opts.mode === 'riddle' || opts.mode === 'fortune' || opts.mode === 'acrostic'
      ? opts.mode
      : opts.mode === 'joke'
        ? 'joke'
        : 'joke';

  const avoidTexts = buildPrizeAiFunAvoidTexts(
    opts.schoolId,
    opts.mode,
    opts.extraAvoid,
    18,
    ageBand,
  );

  const firstName =
    opts.mode === 'acrostic' ? lettersForAcrosticName(opts.firstName || 'Star') : undefined;

  const res = await authFetch('/api/prize-ai-fun', {
    method: 'POST',
    signal: opts.signal,
    body: JSON.stringify({
      schoolId: opts.schoolId,
      mode: opts.mode,
      avoidTexts,
      ...(opts.ageYears != null ? { ageYears: opts.ageYears } : {}),
      ...(firstName ? { firstName } : {}),
    }),
  });

  const j = (await res.json()) as { error?: string; kind?: string; text?: string; answer?: string };
  if (!res.ok) throw new Error(j.error || 'Could not load surprise.');

  const body = normalizeAiSurpriseBody(j, kind);
  if (!body) return null;

  const dedupe = aiSurpriseDedupeKey(kind, body.text);
  if (recentAiSurpriseDedupeSet(opts.schoolId, kind, ageBand).has(dedupe)) return null;

  return body;
}

/** Acrostics are personalized — generate on demand (no prefetch stock). */
export async function requestAcrosticSurprise(
  authFetch: PrizeAiFunFetchAuth,
  opts: {
    schoolId: string;
    firstName: string;
    ageBand?: string;
    ageYears?: number;
    extraAvoid?: readonly string[];
    signal?: AbortSignal;
  },
): Promise<AiSurpriseBody> {
  const ageBand = opts.ageBand ?? '0';
  const letters = lettersForAcrosticName(opts.firstName);
  const displayName = letters.length ? opts.firstName.trim() || 'Star' : 'Star';

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const body = await requestPrizeAiFunSurprise(authFetch, {
        schoolId: opts.schoolId,
        mode: 'acrostic',
        ageBand,
        ageYears: opts.ageYears,
        firstName: displayName,
        extraAvoid: opts.extraAvoid,
        signal: opts.signal,
      });
      if (body) return body;
    } catch {
      /* try fallback */
    }
  }

  return buildFallbackAcrostic(displayName, Date.now());
}
