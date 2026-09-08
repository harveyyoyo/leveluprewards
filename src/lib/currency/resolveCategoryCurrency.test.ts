import { describe, expect, it } from 'vitest';
import type { PreviewCurrency } from '@/components/coupons/Coupon';
import { categoryCurrencyIcon, resolveCategoryCurrency } from './resolveCategoryCurrency';

const school: PreviewCurrency = {
  mode: 'points',
  icon: '⭐',
  label: 'Points',
  couponBgColor: '#ffffff',
  moneyBgColor: '#e8f5e9',
};

describe('resolveCategoryCurrency', () => {
  it('keeps the school look when there is no override', () => {
    expect(resolveCategoryCurrency(school)).toBe(school);
    expect(resolveCategoryCurrency(school, null)).toBe(school);
  });

  it('switches a category to money without changing school defaults', () => {
    const next = resolveCategoryCurrency(school, {
      mode: 'money',
      moneyDesign: '💵',
      moneyBillTitle: 'KINDNESS BUCKS',
    });
    expect(next.mode).toBe('money');
    expect(next.icon).toBe('💵');
    expect(next.moneyBillTitle).toBe('KINDNESS BUCKS');
    expect(next.label).toBe('Money');
    expect(school.mode).toBe('points');
  });

  it('switches a money school to a points coupon and uses the Points label', () => {
    const moneySchool: PreviewCurrency = { ...school, mode: 'money', icon: '💵', label: 'Money' };
    const next = resolveCategoryCurrency(moneySchool, {
      mode: 'points',
      pointsDesign: '🏆',
      pointsTitle: 'STAR POINTS',
    });
    expect(next.mode).toBe('points');
    expect(next.icon).toBe('🏆');
    expect(next.label).toBe('Points');
    expect(next.pointsTitle).toBe('STAR POINTS');
    expect(moneySchool.mode).toBe('money');
  });
});

describe('categoryCurrencyIcon', () => {
  it('uses the override icon and falls back to the school icon', () => {
    expect(categoryCurrencyIcon(undefined, '⭐')).toBe('⭐');
    expect(categoryCurrencyIcon({ mode: 'money', moneyDesign: '🪙' }, '⭐')).toBe('🪙');
    expect(categoryCurrencyIcon({ mode: 'points', pointsDesign: '🏆' }, '⭐')).toBe('🏆');
  });
});
