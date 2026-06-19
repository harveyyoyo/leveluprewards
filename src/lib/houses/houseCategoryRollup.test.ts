import { describe, expect, it } from 'vitest';
import {
  findCategoryByAwardDescription,
  isGoldenTicketCategory,
  shouldRollupCategoryToHouse,
} from './houseCategoryRollup';
import type { Category } from '@/lib/types';

const categories: Category[] = [
  { id: '1', name: 'Kindness', points: 10 },
  { id: '2', name: 'Spirit', points: 5, countsForHousePoints: false },
  { id: '3', name: 'Golden Ticket', points: 50, isGoldenTicket: true },
];

describe('houseCategoryRollup', () => {
  it('finds category by exact award description', () => {
    expect(findCategoryByAwardDescription('Kindness', categories)?.id).toBe('1');
    expect(findCategoryByAwardDescription('Unknown', categories)).toBeUndefined();
  });

  it('rolls up by default and respects countsForHousePoints opt-out', () => {
    expect(shouldRollupCategoryToHouse('Kindness', categories)).toBe(true);
    expect(shouldRollupCategoryToHouse('Spirit', categories)).toBe(false);
    expect(shouldRollupCategoryToHouse('Unknown category', categories)).toBe(true);
  });

  it('detects golden ticket categories', () => {
    expect(isGoldenTicketCategory(categories[2])).toBe(true);
    expect(isGoldenTicketCategory(categories[0])).toBe(false);
  });
});
