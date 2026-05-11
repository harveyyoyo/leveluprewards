import type { Prize, PrizeAiFunReward } from '@/lib/types';

export const AI_JOKE_PRIZE_ID = '__ai_joke__';
/** Single consolidated Fun reward document when AI surprise is enabled (not listed in admin grid). */
export const AI_FUN_UNIFIED_PRIZE_ID = '__ai_fun_unified__';
const AI_FUN_PRIZE_PREFIX = '__ai_fun__:';

export type AiFunPrizeKind = Exclude<PrizeAiFunReward, 'random' | 'picker'> | 'random';

export type PrizeAiFunSurpriseRequestMode = Exclude<PrizeAiFunReward, 'picker'>;

export function getAiFunRewardFromPrizeId(id: string | null | undefined): PrizeAiFunReward | null {
  if (!id) return null;
  if (id === AI_FUN_UNIFIED_PRIZE_ID) return 'picker';
  if (id === AI_JOKE_PRIZE_ID) return 'joke';
  if (!id.startsWith(AI_FUN_PRIZE_PREFIX)) return null;
  const mode = id.slice(AI_FUN_PRIZE_PREFIX.length);
  if (mode === 'random' || mode === 'joke' || mode === 'riddle' || mode === 'fortune') return mode;
  return null;
}

/** Maps prize config + optional student pick to an API mode for /api/prize-ai-fun. */
export function resolveAiFunApiMode(
  prize: Pick<Prize, 'aiFunReward' | 'id'>,
  userPick?: PrizeAiFunReward,
): PrizeAiFunSurpriseRequestMode {
  const ar = prize.aiFunReward ?? getAiFunRewardFromPrizeId(prize.id);
  if (ar === 'picker') {
    const p = userPick && userPick !== 'picker' ? userPick : 'joke';
    return p as PrizeAiFunSurpriseRequestMode;
  }
  if (ar === 'random' || ar === 'joke' || ar === 'riddle' || ar === 'fortune') return ar;
  return 'joke';
}

/** Legacy multi-row AI prizes (hidden from shop/admin grid once unified Fun exists). */
export function isLegacyAiSurprisePrize(p: Pick<Prize, 'id' | 'aiFunReward'> | null | undefined): boolean {
  if (!p) return false;
  if (p.id === AI_FUN_UNIFIED_PRIZE_ID) return false;
  if (p.aiFunReward) return true;
  return !!getAiFunRewardFromPrizeId(p.id);
}

/** Shop listing: hide legacy AI rows; hide unified Fun when school setting is off. */
export function prizeAppearsInRewardsShop(
  p: Prize,
  opts: { enablePrizeAiSurprise?: boolean },
): boolean {
  if (isLegacyAiSurprisePrize(p)) return false;
  if (p.id === AI_FUN_UNIFIED_PRIZE_ID && opts.enablePrizeAiSurprise !== true) return false;
  return true;
}

/** Admin prize table: hide all AI-backed rows (unified is edited in the Fun panel only). */
export function isAiSurpriseHiddenFromAdminGrid(p: Pick<Prize, 'id' | 'aiFunReward'> | null | undefined): boolean {
  if (!p) return false;
  if (p.aiFunReward) return true;
  return !!getAiFunRewardFromPrizeId(p.id);
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

/** Point cost for the unified Fun prize; unset or invalid values default to 1 (explicit 0 is allowed). */
function resolvedUnifiedAiFunPoints(defaultPoints: unknown): number {
  if (defaultPoints == null) return 1;
  const n = Number(defaultPoints);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.floor(n));
}

export function createUnifiedAiFunPrize(defaultPoints = 1): Prize {
  return {
    id: AI_FUN_UNIFIED_PRIZE_ID,
    name: 'Fun',
    points: resolvedUnifiedAiFunPoints(defaultPoints),
    icon: 'Sparkles',
    inStock: true,
    aiFunReward: 'picker',
    offerPrintTicketOnRedeem: true,
    addedBy: 'System',
  };
}

export function withUnifiedAiFunPrize(
  prizes: Prize[] | null | undefined,
  opts: { enablePrizeAiSurprise?: boolean; defaultPoints?: number },
): Prize[] {
  const list = prizes || [];
  if (opts.enablePrizeAiSurprise !== true) return list;
  return [
    ...list.filter((p) => p.id !== AI_FUN_UNIFIED_PRIZE_ID),
    createUnifiedAiFunPrize(opts.defaultPoints),
  ];
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
          ? 'AI Fortune Teller'
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
