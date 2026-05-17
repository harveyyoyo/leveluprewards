import { doc, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Prize } from '@/lib/types';
import { CATEGORY_COLOR_PALETTE, pickDistinctCategoryColor } from '@/lib/utils';

/** Stable accent from prize id (used when creating prizes without an explicit color). */
export function prizeCardColorForId(prizeId: string): string {
  let hash = 0;
  for (let i = 0; i < prizeId.length; i++) {
    hash = (hash * 31 + prizeId.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_COLOR_PALETTE[hash % CATEGORY_COLOR_PALETTE.length];
}

/** Assigns a distinct `cardColor` to prizes that do not have one yet (idempotent). */
export async function backfillPrizeCardColors(
  firestore: Firestore,
  schoolId: string,
  prizes: Prize[],
): Promise<number> {
  const sorted = [...prizes].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const usedColors = sorted
    .map((p) => p.cardColor?.trim())
    .filter((c): c is string => !!c);
  const updates: Array<{ id: string; cardColor: string }> = [];

  for (const prize of sorted) {
    if (prize.cardColor?.trim()) continue;
    const cardColor = pickDistinctCategoryColor(usedColors);
    usedColors.push(cardColor);
    updates.push({ id: prize.id, cardColor });
  }

  await Promise.all(
    updates.map(({ id, cardColor }) =>
      updateDoc(doc(firestore, 'schools', schoolId, 'prizes', id), { cardColor }),
    ),
  );

  return updates.length;
}
