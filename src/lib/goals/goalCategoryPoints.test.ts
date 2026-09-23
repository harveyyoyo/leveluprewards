import { describe, expect, it } from 'vitest';
import { activityCountsForCategory, earnedInCategory } from './goalCategoryPoints';

describe('earnedInCategory', () => {
  it('counts earned points, not the spendable balance left after buying prizes', () => {
    const student = {
      categoryPoints: { Kindness: 10 },
      categoryPointsByPeriod: { all: { Kindness: 60 } },
    };
    expect(earnedInCategory(student, 'Kindness')).toBe(60);
  });

  it('includes classroom points recorded under a teacher-scoped key', () => {
    const student = {
      categoryPointsByPeriod: { all: { Kindness: 20, '__cm__:t1:Kindness': 15, '__cm__:t1:Effort': 99 } },
    };
    expect(earnedInCategory(student, 'Kindness')).toBe(35);
  });

  it('falls back to the balance for students without all-time totals', () => {
    expect(earnedInCategory({ categoryPoints: { Kindness: 12 } }, 'Kindness')).toBe(12);
    expect(earnedInCategory({}, 'Kindness')).toBe(0);
  });
});

describe('activityCountsForCategory', () => {
  it('matches awards, classroom points and coupons for the category', () => {
    expect(activityCountsForCategory('Kindness', 'Kindness')).toBe(true);
    expect(activityCountsForCategory('Redeemed coupon: AB12 (Kindness)', 'Kindness')).toBe(true);
    expect(activityCountsForCategory('Redeemed coupon: AB12 (Effort)', 'Kindness')).toBe(false);
    expect(activityCountsForCategory('Goal reward: 50 Kindness points', 'Kindness')).toBe(false);
    expect(activityCountsForCategory(undefined, 'Kindness')).toBe(false);
  });
});
