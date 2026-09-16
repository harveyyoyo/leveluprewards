import type { CategoryCurrencyOverride } from '@/lib/types';
import type { PreviewCurrency } from '@/components/coupons/Coupon';

export function categoryCurrencyIcon(
  override: CategoryCurrencyOverride | null | undefined,
  fallbackIcon: string,
): string {
  if (!override) return fallbackIcon;
  if (override.mode === 'money') return override.moneyDesign || fallbackIcon;
  if (override.mode === 'coins') return override.coinDesign || fallbackIcon;
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
  const isCoins = mode === 'coins';
  const icon = isMoney
    ? override.moneyDesign || school.icon
    : isCoins
      ? override.coinDesign || school.icon
      : override.pointsDesign || school.icon;

  return {
    ...school,
    mode,
    icon,
    label: mode === school.mode ? school.label : isMoney ? 'Money' : isCoins ? 'Tokens' : 'Points',
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
    coinFinish: override.coinFinish ?? school.coinFinish,
    coinRimStyle: override.coinRimStyle ?? school.coinRimStyle,
    coinTopText: override.coinTopText ?? school.coinTopText,
    coinBottomText: override.coinBottomText ?? school.coinBottomText,
    coinShowSchoolName: override.coinShowSchoolName ?? school.coinShowSchoolName,
    coinShowValue: override.coinShowValue ?? school.coinShowValue,
  };
}

export function defaultCategoryCurrencyOverride(school: PreviewCurrency): CategoryCurrencyOverride {
  return {
    mode: school.mode,
    pointsDesign: school.icon,
    moneyDesign: school.mode === 'money' ? school.icon : '💵',
    coinDesign: school.mode === 'coins' ? school.icon : '🪙',
    coinFinish: school.coinFinish,
    coinRimStyle: school.coinRimStyle,
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
