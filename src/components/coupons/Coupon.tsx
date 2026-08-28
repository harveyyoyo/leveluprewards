'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { CouponCornerStyle } from '@/lib/coupons/couponPrint';
import type { Coupon } from '@/lib/types';
import { couponRedemptionLabelForPrint } from '@/lib/coupons/couponRedemptionRules';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/appBranding';
import { PrintIdCardScanCode } from '@/components/print/PrintIdCardScanCode';
import { PrintLevelUpDomain } from '@/components/print/PrintLevelUpDomain';
import { useSchoolDisplayName } from '@/hooks/useSchoolDisplayName';
import { useCurrency } from '@/hooks/useCurrency';
import { MoneyBill, type MoneyBillDesign, MONEY_BILL_DEFAULTS } from '@/components/coupons/MoneyBill';

export type PreviewCurrency = {
  mode: 'points' | 'money';
  icon: string;
  label: string;
  // Points coupon design
  couponBgColor?: string;
  couponTextColor?: string;
  couponBorderColor?: string;
  couponBorderStyle?: 'dotted' | 'dashed' | 'solid';
  pointsTitle?: string;
  pointsShowSchoolName?: boolean;
  pointsShowBarcode?: boolean;
  pointsShowDomain?: boolean;
  // Money bill design overrides
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

function CouponTitle({ text, compact }: { text: string; compact: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const label = textRef.current;
    if (!container || !label) return;

    setScale(1);
    const fit = () => {
      const available = container.clientWidth;
      const needed = label.scrollWidth;
      if (available > 0 && needed > available) {
        setScale(Math.max(0.62, available / needed));
      }
    };

    fit();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    observer?.observe(container);
    return () => observer?.disconnect();
  }, [text, compact]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'coupon-title w-full max-w-full shrink-0 overflow-hidden text-center',
        compact ? 'mb-[0.04em] text-[0.5em]' : 'mb-[0.08em] text-[0.5625em]',
      )}
    >
      <span
        ref={textRef}
        className="inline-block whitespace-nowrap font-bold uppercase leading-none tracking-[0.04em]"
        style={scale < 1 ? { transform: `scale(${scale})`, transformOrigin: 'top center' } : undefined}
      >
        {text}
      </span>
    </div>
  );
}

export function Coupon({
  coupon,
  schoolId,
  isNew = false,
  cornerStyle,
  previewCurrency,
}: {
  coupon: Coupon;
  schoolId?: string | null;
  isNew?: boolean;
  cornerStyle?: CouponCornerStyle;
  previewCurrency?: PreviewCurrency;
}) {
  const { settings } = useSettings();
  const schoolDisplayName = useSchoolDisplayName(schoolId);
  const realCurrency = useCurrency();
  const currency = previewCurrency || realCurrency;
  
  const isColored = settings.enableColorPrinting && coupon.color;

  // ─── Money mode: render the dollar-bill style component ───
  if (currency.mode === 'money') {
    const moneyDesign: MoneyBillDesign = {
      bgColor: currency.moneyBgColor ?? MONEY_BILL_DEFAULTS.bgColor,
      accentColor: isColored ? coupon.color! : (currency.moneyAccentColor ?? MONEY_BILL_DEFAULTS.accentColor),
      textColor: currency.moneyTextColor ?? MONEY_BILL_DEFAULTS.textColor,
      denominationPrefix: currency.moneyDenominationPrefix ?? MONEY_BILL_DEFAULTS.denominationPrefix,
      billTitle: currency.moneyBillTitle ?? MONEY_BILL_DEFAULTS.billTitle,
      borderStyle: currency.moneyBorderStyle ?? MONEY_BILL_DEFAULTS.borderStyle,
      showSerial: currency.moneyShowSerial ?? MONEY_BILL_DEFAULTS.showSerial,
      showGuilloche: currency.moneyShowGuilloche ?? MONEY_BILL_DEFAULTS.showGuilloche,
      showSchoolName: currency.moneyShowSchoolName ?? MONEY_BILL_DEFAULTS.showSchoolName,
    };
    return (
      <MoneyBill
        coupon={coupon}
        schoolName={schoolDisplayName || undefined}
        design={moneyDesign}
      />
    );
  }

  // ─── Points mode: classic coupon layout ───
  const appNameText = currency.pointsTitle || APP_NAME;
  const title = (schoolDisplayName && currency.pointsShowSchoolName !== false) 
    ? `${appNameText} - ${schoolDisplayName}` 
    : appNameText;
    
  const useQr = settings.couponUseQrCode === true;
  const showBarcode = currency.pointsShowBarcode !== false;
  const showDomain = currency.pointsShowDomain !== false;

  const redemptionLabel = couponRedemptionLabelForPrint(coupon);
  const hasLimitLine = Boolean(redemptionLabel);

  const style: React.CSSProperties = {
    backgroundColor: currency?.couponBgColor || '#ffffff',
    color: isColored ? coupon.color : (currency?.couponTextColor || '#000000'),
    borderColor: isColored ? coupon.color : (currency?.couponBorderColor || undefined),
    borderStyle: currency?.couponBorderStyle || 'dotted',
  };

  return (
    <div
      style={style}
      className={cn(
        'coupon-scalable py-[0.22em] px-[0.45em] border shadow-sm inline-flex flex-col items-center justify-between text-center h-[5em] w-[9.5em] relative overflow-hidden',
        cornerStyle === 'rectangular'
          ? 'rounded-none print-coupon--rectangular'
          : cornerStyle === 'rounded'
            ? 'rounded-[0.75em] print-coupon--rounded'
            : 'rounded-[0.75em]',
        useQr && 'print-coupon--qr-scan',
        !isColored && !style.borderColor && 'border-slate-400 text-slate-800',
        (!style.backgroundColor || style.backgroundColor === '#ffffff') && 'bg-white'
      )}
    >
      {isNew && (
        <div className="absolute top-[0.25em] right-[0.25em] bg-primary/80 text-white text-[0.5625em] px-[0.375em] py-[0.125em] rounded-full font-bold leading-none">
          NEW
        </div>
      )}
      <CouponTitle text={title} compact={hasLimitLine || useQr} />
      <div
        className={cn(
          'coupon-main w-full flex items-center shrink-0 border-y',
          useQr ? 'gap-[0.35em] py-[0.06em] px-[0.02em]' : 'justify-center gap-[0.45em] py-[0.125em]',
          hasLimitLine && !useQr && 'py-[0.08em]',
          !isColored && !style.borderColor && 'border-slate-200',
        )}
        style={(style.borderColor || isColored) ? { borderColor: 'color-mix(in srgb, currentColor 30%, transparent)' } : undefined}
      >
        {useQr && showBarcode ? (
          <div className="coupon-qr-slot shrink-0" aria-label={`Coupon scan code ${coupon.code}`}>
            <PrintIdCardScanCode
              value={coupon.code}
              useQr
              hideCenterBadge
              variant="coupon"
              placement="inline"
              className="coupon-qr"
            />
          </div>
        ) : null}
        <div className={cn('flex items-center', (useQr && showBarcode) ? 'min-w-0 flex-1 justify-start gap-[0.35em]' : 'justify-center gap-[0.45em] w-full min-w-0')}>
          <div className="flex flex-col items-center leading-none shrink-0">
            <div className="flex items-center gap-[0.1em]">
              <span className="text-[1.125em] font-black leading-none" style={style.color ? { color: style.color } : { color: '#000' }}>
                {Number(coupon.value ?? 0)}
              </span>
              <span className="text-[0.75em]">{currency.icon}</span>
            </div>
            <span className="text-[0.4375em] font-bold uppercase tracking-[0.2em] mt-[0.125em]">
              {currency.label}
            </span>
          </div>
          <div className="text-left leading-snug min-w-0">
            <div className="font-bold italic text-[0.6em] leading-tight break-words">
              {coupon.category}
            </div>
            <div className={cn((isColored || style.color !== '#000000') ? 'opacity-80' : 'text-slate-600', 'leading-tight text-[0.45em] break-words')}>
              Issued by: {coupon.teacher}
            </div>
          </div>
        </div>
      </div>
      <div className="coupon-barcode-zone flex flex-col items-center w-full mt-[0.06em] shrink-0 gap-[0.04em]">
        {redemptionLabel && (
          <div
            className="coupon-redemption-label text-[0.24em] leading-tight font-bold text-center w-full max-w-full px-[0.1em] overflow-hidden text-ellipsis whitespace-nowrap"
            style={style.color ? { color: style.color } : { color: '#000' }}
            title={redemptionLabel}
          >
            {redemptionLabel}
          </div>
        )}
        {!useQr && showBarcode ? (
          <PrintIdCardScanCode value={coupon.code} variant="coupon" className="coupon-barcode w-full max-w-full" />
        ) : null}
        {(coupon.startsAt || coupon.expiresAt) && (
          <div className={cn('uppercase opacity-70 leading-none flex flex-col gap-[0.04em]', hasLimitLine ? 'text-[0.28em]' : 'text-[0.33em]')}>
            {coupon.startsAt && (
              <span>Valid from {new Date(coupon.startsAt).toLocaleDateString()}</span>
            )}
            {coupon.expiresAt && (
              <span>Expires {new Date(coupon.expiresAt).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </div>
      {showDomain && (
        <PrintLevelUpDomain className="text-[0.26em] font-semibold uppercase tracking-[0.12em] opacity-60 leading-none mt-[0.04em]" />
      )}
    </div>
  );
}
