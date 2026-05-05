import type { Prize, PrizeAiFunReward } from '@/lib/types';

export const AI_JOKE_PRIZE_ID = '__ai_joke__';

export function isAiJokePrize(p: Pick<Prize, 'id'> | null | undefined): boolean {
  return !!p && p.id === AI_JOKE_PRIZE_ID;
}

export function createAiJokePrize(): Prize {
  const aiFunReward: PrizeAiFunReward = 'joke';
  return {
    id: AI_JOKE_PRIZE_ID,
    name: 'AI Joke',
    points: 0,
    icon: 'Sparkles',
    inStock: true,
    aiFunReward,
    addedBy: 'System',
  };
}

