'use client';

import { useDoc } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { useTranslation } from '@/components/providers/LocaleProvider';

export type CurrencyMode = 'points' | 'money';

interface CurrencyDataDoc {
  currencySettings?: {
    mode: CurrencyMode;
    pointsDesign?: string;
    moneyDesign?: string;
    // Points coupon design
    couponBgColor?: string;
    couponTextColor?: string;
    couponBorderColor?: string;
    couponBorderStyle?: 'dotted' | 'dashed' | 'solid';
    pointsTitle?: string;
    pointsShowSchoolName?: boolean;
    pointsShowBarcode?: boolean;
    pointsShowDomain?: boolean;
    // Money bill design
    moneyBgColor?: string;
    moneyAccentColor?: string;
    moneyTextColor?: string;
    moneyDenominationPrefix?: string;
    moneyBillTitle?: string;
    moneyBorderStyle?: 'ornate' | 'classic' | 'simple';
    moneyShowSerial?: boolean;
    moneyShowGuilloche?: boolean;
    moneyShowSchoolName?: boolean;
  };
}

export function useCurrency() {
  const { t } = useTranslation();
  const schoolDocRef = useSchoolMetadataDocRef();
  const { data } = useDoc<CurrencyDataDoc>(schoolDocRef);

  const cs = data?.currencySettings;
  const mode = cs?.mode || 'points';
  const pointsDesign = cs?.pointsDesign || '⭐';
  const moneyDesign = cs?.moneyDesign || '💵';

  const isMoney = mode === 'money';
  
  const label = isMoney ? t('student.kiosk.money') : t('student.kiosk.points');
  const icon = isMoney ? moneyDesign : pointsDesign;

  return {
    mode,
    isMoney,
    label,
    icon,
    pointsDesign,
    moneyDesign,
    // Points coupon design
    couponBgColor: cs?.couponBgColor,
    couponTextColor: cs?.couponTextColor,
    couponBorderColor: cs?.couponBorderColor,
    couponBorderStyle: cs?.couponBorderStyle,
    pointsTitle: cs?.pointsTitle,
    pointsShowSchoolName: cs?.pointsShowSchoolName ?? true,
    pointsShowBarcode: cs?.pointsShowBarcode ?? true,
    pointsShowDomain: cs?.pointsShowDomain ?? true,
    // Money bill design
    moneyBgColor: cs?.moneyBgColor ?? '#e8f5e9',
    moneyAccentColor: cs?.moneyAccentColor ?? '#2e7d32',
    moneyTextColor: cs?.moneyTextColor ?? '#1b5e20',
    moneyDenominationPrefix: cs?.moneyDenominationPrefix ?? '$',
    moneyBillTitle: cs?.moneyBillTitle ?? 'SCHOOL BUCKS',
    moneyBorderStyle: cs?.moneyBorderStyle ?? 'ornate',
    moneyShowSerial: cs?.moneyShowSerial ?? true,
    moneyShowGuilloche: cs?.moneyShowGuilloche ?? true,
    moneyShowSchoolName: cs?.moneyShowSchoolName ?? true,
  };
}
