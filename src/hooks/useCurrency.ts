'use client';

import { useDoc } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { useTranslation } from '@/components/providers/LocaleProvider';

export type CurrencyMode = 'points' | 'money' | 'coins';

interface CurrencyDataDoc {
  currencySettings?: {
    mode: CurrencyMode;
    pointsDesign?: string;
    moneyDesign?: string;
    coinDesign?: string;
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
    moneyWatermark?: string;
    moneySignatureTitle?: string;
    moneyDenominationColors?: Record<string, { bg: string; accent: string; text: string }>;
    // Coins & tokens design
    coinFinish?: 'gold' | 'silver' | 'bronze' | 'copper' | 'emerald';
    coinRimStyle?: 'ridged' | 'smooth' | 'stars';
    coinTopText?: string;
    coinBottomText?: string;
    coinShowSchoolName?: boolean;
    coinShowValue?: boolean;
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
  const coinDesign = cs?.coinDesign || '🪙';

  const isMoney = mode === 'money';
  const isCoins = mode === 'coins';
  
  const label = isMoney ? t('student.kiosk.money') : isCoins ? 'Tokens' : t('student.kiosk.points');
  const icon = isMoney ? moneyDesign : isCoins ? coinDesign : pointsDesign;

  return {
    mode,
    isMoney,
    isCoins,
    label,
    icon,
    pointsDesign,
    moneyDesign,
    coinDesign,
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
    moneyWatermark: cs?.moneyWatermark,
    moneySignatureTitle: cs?.moneySignatureTitle,
    moneyDenominationColors: cs?.moneyDenominationColors,
    // Coin design
    coinFinish: cs?.coinFinish ?? 'gold',
    coinRimStyle: cs?.coinRimStyle ?? 'ridged',
    coinTopText: cs?.coinTopText,
    coinBottomText: cs?.coinBottomText,
    coinShowSchoolName: cs?.coinShowSchoolName ?? true,
    coinShowValue: cs?.coinShowValue ?? true,
  };
}
