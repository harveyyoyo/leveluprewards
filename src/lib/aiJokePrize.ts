import type { Prize, PrizeAiFunReward } from '@/lib/types';

export const AI_JOKE_PRIZE_ID = '__ai_joke__';
const AI_FUN_PRIZE_PREFIX = '__ai_fun__:';

export type AiFunPrizeKind = Exclude<PrizeAiFunReward, 'random'> | 'random';

export function getAiFunRewardFromPrizeId(id: string | null | undefined): PrizeAiFunReward | null {
  if (!id) return null;
  if (id === AI_JOKE_PRIZE_ID) return 'joke';
  if (!id.startsWith(AI_FUN_PRIZE_PREFIX)) return null;
  const mode = id.slice(AI_FUN_PRIZE_PREFIX.length);
  if (mode === 'random' || mode === 'joke' || mode === 'riddle' || mode === 'fortune') return mode;
  return null;
}

/** True if this prize delivers an AI-generated surprise (Firestore-backed or legacy synthetic ids). */
export function isAiFunPrize(p: Pick<Prize, 'id' | 'aiFunReward'> | null | undefined): boolean {
  if (!p) return false;
  if (p.aiFunReward) return true;
  return !!getAiFunRewardFromPrizeId(p.id);
}

export function isAiJokePrize(p: Pick<Prize, 'id'> | null | undefined): boolean {
  return getAiFunRewardFromPrizeId(p?.id) === 'joke';
}

export function createAiJokePrize(): Prize {
  return createAiFunPrize('joke', { legacyId: AI_JOKE_PRIZE_ID });
}

export function createAiFunPrize(
  aiFunReward: PrizeAiFunReward,
  opts?: { legacyId?: string },
): Prize {
  const id = (opts?.legacyId ?? `${AI_FUN_PRIZE_PREFIX}${aiFunReward}`) as string;
  const name =
    aiFunReward === 'joke'
      ? 'AI Joke'
      : aiFunReward === 'riddle'
        ? 'AI Riddle'
        : aiFunReward === 'fortune'
          ? 'AI Fortune'
          : 'AI Surprise';
  return {
    id,
    name,
    points: 0,
    icon: 'Sparkles',
    inStock: true,
    aiFunReward,
    offerPrintTicketOnRedeem: true,
    addedBy: 'System',
  };
}

