import type { Firestore } from 'firebase/firestore';

import { prizeAppearsInRewardsShop } from '@/lib/aiJokePrize';
import { lookupPrizeByScanCode } from '@/lib/db/lookup';
import { isPrizeScanCode, normalizeScanInput } from '@/lib/prizes/prizeScanCode';
import { prizeIsListed, studentSeesPrizeByTeachers } from '@/lib/prizes/prizeUtils';
import type { Prize, Student } from '@/lib/types';

export type PrizeShelfScanFailure = {
  title: string;
  description: string;
};

export type PrizeShelfScanResolveOptions = {
  enablePrizeAiSurprise: boolean;
  /** When false, affordability is not required (e.g. staff desk opens confirm elsewhere). Default true. */
  requireAffordable?: boolean;
};

/** Whether this prize can appear for the student in the rewards shop (listed, access, class). */
export function studentSeesPrizeInShop(
  student: Student,
  prize: Prize,
  options: Pick<PrizeShelfScanResolveOptions, 'enablePrizeAiSurprise'>,
): boolean {
  if (!prizeAppearsInRewardsShop(prize, { enablePrizeAiSurprise: options.enablePrizeAiSurprise })) {
    return false;
  }
  if (!prizeIsListed(prize)) return false;
  if (!studentSeesPrizeByTeachers(student, prize)) return false;
  if (prize.classId && student.classId !== prize.classId) return false;
  return true;
}

/**
 * Resolve a shelf barcode (PZ…) to a prize the signed-in student may redeem.
 * Used after student ID scan on kiosk and prize desk flows.
 */
export async function resolvePrizeShelfScanForStudent(
  firestore: Firestore,
  schoolId: string,
  rawCode: string,
  catalog: Prize[],
  student: Student,
  options: PrizeShelfScanResolveOptions,
): Promise<{ prize: Prize } | { error: PrizeShelfScanFailure }> {
  const code = normalizeScanInput(rawCode);
  if (!isPrizeScanCode(code)) {
    return {
      error: {
        title: 'Not a prize card',
        description: 'Scan the barcode on the reward shelf card (starts with PZ).',
      },
    };
  }

  const prizeId = await lookupPrizeByScanCode(firestore, schoolId, code);
  if (!prizeId) {
    return {
      error: {
        title: 'Prize not found',
        description: 'This card is not in the rewards catalog.',
      },
    };
  }

  const prize = catalog.find((p) => p.id === prizeId);
  if (!prize) {
    return {
      error: {
        title: 'Prize unavailable',
        description: 'This reward is not active in the shop right now.',
      },
    };
  }

  if (!studentSeesPrizeInShop(student, prize, options)) {
    return {
      error: {
        title: 'Prize not available for you',
        description: 'This reward is not listed for your class or teachers. Pick another prize or ask staff.',
      },
    };
  }

  const requireAffordable = options.requireAffordable !== false;
  const studentPoints = typeof student.points === 'number' ? student.points : 0;
  const cost = typeof prize.points === 'number' ? prize.points : 0;
  if (requireAffordable && studentPoints < cost) {
    const shortfall = Math.max(0, cost - studentPoints);
    return {
      error: {
        title: 'Not enough points',
        description: `You need ${cost.toLocaleString()} pts for "${prize.name}" (${shortfall.toLocaleString()} more).`,
      },
    };
  }

  return { prize };
}

/** Staff prize desk: any active catalog item with stock (no class/teacher filter). */
export async function resolvePrizeShelfScanForDesk(
  firestore: Firestore,
  schoolId: string,
  rawCode: string,
  catalog: Prize[],
): Promise<{ prize: Prize } | { error: PrizeShelfScanFailure }> {
  const code = normalizeScanInput(rawCode);
  if (!isPrizeScanCode(code)) {
    return {
      error: {
        title: 'Not a prize card',
        description: 'Scan the barcode on the reward shelf card (starts with PZ).',
      },
    };
  }

  const prizeId = await lookupPrizeByScanCode(firestore, schoolId, code);
  if (!prizeId) {
    return {
      error: {
        title: 'Prize not found',
        description: 'This card is not in the rewards catalog.',
      },
    };
  }

  const prize = catalog.find((p) => p.id === prizeId);
  if (!prize) {
    return {
      error: {
        title: 'Prize unavailable',
        description: 'This reward is not active in the shop.',
      },
    };
  }

  if (!prize.inStock) {
    return {
      error: {
        title: 'Out of stock',
        description: `${prize.name} is not available right now.`,
      },
    };
  }

  if (typeof prize.stockCount === 'number' && prize.stockCount < 1) {
    return {
      error: {
        title: 'Out of stock',
        description: `${prize.name} is not available right now.`,
      },
    };
  }

  return { prize };
}
