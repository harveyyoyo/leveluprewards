import { describe, expect, it } from 'vitest';
import type { Category, Prize, Student } from '@/lib/types';
import {
  describePrizeShortage,
  shownBalanceAfterPrizePurchase,
  studentCanAffordPrizeByCategory,
  studentSpendablePointsForPrize,
} from './prizeCategoryEligibility';

const kindness: Category = { id: 'cat-k', name: 'Kindness', points: 5 };
const student = (points: number, categoryPoints?: Record<string, number>): Pick<Student, 'points' | 'categoryPoints'> => ({
  points,
  categoryPoints,
});
const prize = (points: number, categoryIds?: string[]): Pick<Prize, 'points' | 'categoryIds'> => ({
  points,
  categoryIds,
});

describe('prize confirm affordability', () => {
  it('does not treat the whole wallet as enough when a prize needs a category pile', () => {
    const kid = student(61, {});
    const candy = prize(50, ['cat-k']);
    expect(studentSpendablePointsForPrize(kid, candy, [kindness])).toBe(0);
    expect(studentCanAffordPrizeByCategory(kid, candy, [kindness])).toBe(false);
    expect(shownBalanceAfterPrizePurchase(61, 0, 50, false)).toBe(-50);
    expect(describePrizeShortage(kid, candy, [kindness])).toBe(
      'This prize uses Kindness points. You have 0 and need 50.',
    );
  });

  it('lets them buy when the category pile covers the cost', () => {
    const kid = student(61, { Kindness: 50 });
    const candy = prize(50, ['cat-k']);
    expect(studentCanAffordPrizeByCategory(kid, candy, [kindness])).toBe(true);
    expect(shownBalanceAfterPrizePurchase(61, 50, 50, true)).toBe(11);
    expect(describePrizeShortage(kid, candy, [kindness])).toBeNull();
  });

  it('uses the whole wallet when the prize is not locked to a category', () => {
    const kid = student(61);
    const candy = prize(50);
    expect(studentSpendablePointsForPrize(kid, candy, [])).toBe(61);
    expect(studentCanAffordPrizeByCategory(kid, candy, [])).toBe(true);
    expect(shownBalanceAfterPrizePurchase(61, 61, 50, true)).toBe(11);
  });
});
