import type { CategoryCurrencyOverride } from '@/lib/types';
import type { PreviewCurrency } from '@/components/coupons/Coupon';

export function categoryCurrencyIcon(
  override: CategoryCurrencyOverride | null | undefined,
  fallbackIcon: string,
): string {
  if (!override) return fallbackIcon;
  if (override.mode === 'money') return override.moneyDesign || fallbackIcon;
  return override.pointsDesign || fallbackIcon;
}

/** Merge school-wide currency look with an optional category/coupon override. */
export function resolveCategoryCurrency(
  school: PreviewCurrency,
  override?: CategoryCurrencyOverride | null,
): PreviewCurrency {
  if (!override) return school;

  const mode = override.mode || school.mode;
  const isMoney = mode === 'money';
  const icon = isMoney
    ? override.moneyDesign || school.icon
    : override.pointsDesign || school.icon;

  return {
    ...school,
    mode,
    icon,
    label: mode === school.mode ? school.label : isMoney ? 'Money' : 'Points',
    couponBgColor: override.couponBgColor ?? school.couponBgColor,
    couponTextColor: override.couponTextColor ?? school.couponTextColor,
    couponBorderColor: override.couponBorderColor ?? school.couponBorderColor,
    couponBorderStyle: override.couponBorderStyle ?? school.couponBorderStyle,
    pointsTitle: override.pointsTitle ?? school.pointsTitle,
    moneyBgColor: override.moneyBgColor ?? school.moneyBgColor,
    moneyAccentColor: override.moneyAccentColor ?? school.moneyAccentColor,
    moneyTextColor: override.moneyTextColor ?? school.moneyTextColor,
    moneyDenominationPrefix: override.moneyDenominationPrefix ?? school.moneyDenominationPrefix,
    moneyBillTitle: override.moneyBillTitle ?? school.moneyBillTitle,
    moneyBorderStyle: override.moneyBorderStyle ?? school.moneyBorderStyle,
  };
}

export function defaultCategoryCurrencyOverride(school: PreviewCurrency): CategoryCurrencyOverride {
  return {
    mode: school.mode,
    pointsDesign: school.icon,
    moneyDesign: school.mode === 'money' ? school.icon : '💵',
    couponBgColor: school.couponBgColor,
    couponTextColor: school.couponTextColor,
    couponBorderColor: school.couponBorderColor,
    couponBorderStyle: school.couponBorderStyle,
    pointsTitle: school.pointsTitle,
    moneyBgColor: school.moneyBgColor,
    moneyAccentColor: school.moneyAccentColor,
    moneyTextColor: school.moneyTextColor,
    moneyDenominationPrefix: school.moneyDenominationPrefix,
    moneyBillTitle: school.moneyBillTitle,
    moneyBorderStyle: school.moneyBorderStyle,
  };
}
