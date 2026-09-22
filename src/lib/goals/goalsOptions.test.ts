import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GOALS_OPTIONS,
  familyGoalStatusLine,
  familyGoalTypeLabel,
  isGoalCrushed,
  pointsNeededForPrize,
  pointsStillNeeded,
  progressPercentUncapped,
  resolveGoalsOptions,
  suggestGoalsFromHabits,
} from './goalsOptions';
import type { Category, Student } from '@/lib/types';

describe('goalsOptions', () => {
  it('resolves defaults and overrides', () => {
    expect(resolveGoalsOptions(undefined).celebrateOnAward).toBe(true);
    expect(resolveGoalsOptions({ celebrateOnAward: false }).celebrateOnAward).toBe(false);
    expect(resolveGoalsOptions({}).hideEmptySections).toBe(DEFAULT_GOALS_OPTIONS.hideEmptySections);
  });

  it('computes need-more and crushed progress', () => {
    expect(pointsStillNeeded(40, 100)).toBe(60);
    expect(pointsNeededForPrize(30, 100)).toBe(70);
    expect(isGoalCrushed(120, 100)).toBe(true);
    expect(progressPercentUncapped(150, 100)).toBe(150);
  });

  it('uses family-friendly wording', () => {
    expect(familyGoalTypeLabel('prize_savings')).toBe('Saving for a reward');
    expect(
      familyGoalStatusLine({ status: 'active', progress: 20, targetPoints: 50, createdByStudent: true }),
    ).toMatch(/Needs 30 more/);
    expect(familyGoalStatusLine({ status: 'completed', progress: 50, targetPoints: 50 })).toMatch(/Done/);
  });

  it('suggests habits from category totals', () => {
    const students = [
      { id: '1', categoryPoints: { Kindness: 80, Math: 10 } },
      { id: '2', categoryPoints: { Kindness: 40, Math: 5 } },
    ] as unknown as Student[];
    const categories = [{ id: 'c1', name: 'Kindness' }] as unknown as Category[];
    const suggestions = suggestGoalsFromHabits(students, categories);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]?.title.toLowerCase()).toContain('kindness');
  });
});
