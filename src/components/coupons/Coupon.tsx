'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CouponCornerStyle } from '@/lib/coupons/couponPrint';
import type { Coupon } from '@/lib/types';
import { couponRedemptionLabelForPrint } from '@/lib/coupons/couponRedemptionRules';
import { isReusableCoupon } from '@/lib/coupons/reusableCoupon';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/appBranding';
import { PrintIdCardScanCode } from '@/components/print/PrintIdCardScanCode';
import { PrintLevelUpDomain } from '@/components/print/PrintLevelUpDomain';
import { useSchoolDisplayName } from '@/hooks/useSchoolDisplayName';
import { useCurrency } from '@/hooks/useCurrency';
import { MoneyBill, type MoneyBillDesign, MONEY_BILL_DEFAULTS } from '@/components/coupons/MoneyBill';
import { CoinTokenPreview, type CoinFinish, type CoinRimStyle } from '@/components/coupons/CoinTokenPreview';

export type PreviewCurrency = {
  mode: 'points' | 'money' | 'coins';
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
  // Coins & tokens design overrides
  coinFinish?: CoinFinish;
  coinRimStyle?: CoinRimStyle;
  coinTopText?: string;
  coinBottomText?: string;
  coinShowSchoolName?: boolean;
  coinShowValue?: boolean;
};

const COUPON_FIT_MIN = 0.68;

function formatCouponDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
}

/** Keeps all coupon text inside the fixed coupon box (never clips past the border). */
function useCouponBoxFit(deps: readonly unknown[]) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const available = root.clientHeight;
        if (available <= 0) return;

        const prevTransform = body.style.transform;
        const prevWidth = body.style.width;
        const prevHeight = body.style.height;
        body.style.transform = 'none';
        body.style.width = '100%';
        body.style.height = 'auto';
        const needed = body.scrollHeight;
        body.style.transform = prevTransform;
        body.style.width = prevWidth;
        body.style.height = prevHeight;

        const next = needed > available + 0.5 ? Math.max(COUPON_FIT_MIN, available / needed) : 1;
        setFit((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
      });
    };

    measure();
    // Barcode SVG paints a tick after first layout — remeasure so dates stay inside.
    const retry = window.setTimeout(measure, 80);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(retry);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps passed by caller
  }, deps);

  return { rootRef, bodyRef, fit };
}

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
        compact ? 'mb-[0.02em] text-[0.48em]' : 'mb-[0.06em] text-[0.5625em]',
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

function CouponBox({
  style,
  className,
  bodyClassName,
  fitKey,
  children,
}: {
  style: CSSProperties;
  className?: string;
  bodyClassName?: string;
  fitKey: readonly unknown[];
  children: ReactNode;
}) {
  const { rootRef, bodyRef, fit } = useCouponBoxFit(fitKey);

  return (
    <div
      ref={rootRef}
      style={style}
      className={cn(
        'coupon-scalable relative box-border inline-flex h-[5em] w-[9.5em] overflow-hidden border shadow-sm',
        className,
      )}
    >
      <div
        ref={bodyRef}
        className={cn(
          'coupon-scalable-body flex w-full min-h-0 min-w-0 flex-col items-center justify-between overflow-hidden text-center',
          bodyClassName,
        )}
        style={
          fit < 1
            ? {
                transform: `scale(${fit})`,
                transformOrigin: 'top center',
                width: '100%',
              }
            : {
                height: '100%',
                width: '100%',
              }
        }
      >
        {children}
      </div>
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

  // ─── Coins & tokens mode: 3D medallion component ───
  if (currency.mode === 'coins') {
    return (
      <CoinTokenPreview
        coupon={coupon}
        schoolName={schoolDisplayName || undefined}
        design={{
          finish: currency.coinFinish ?? 'gold',
          rimStyle: currency.coinRimStyle ?? 'ridged',
          topText: currency.coinTopText,
          bottomText: currency.coinBottomText,
          emblem: currency.icon || '⭐',
          showSchoolName: currency.coinShowSchoolName ?? true,
          showValue: currency.coinShowValue ?? true,
        }}
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
  const reusable = isReusableCoupon(coupon);
  const hasLimitLine = Boolean(redemptionLabel) || reusable;
  const hasStarts = typeof coupon.startsAt === 'number' && Number.isFinite(coupon.startsAt);
  const hasExpires = typeof coupon.expiresAt === 'number' && Number.isFinite(coupon.expiresAt);
  const hasDates = hasStarts || hasExpires;
  const bothDates = hasStarts && hasExpires;
  const compact = hasLimitLine || useQr || hasDates;

  const style: CSSProperties = {
    backgroundColor: currency?.couponBgColor || '#ffffff',
    color: isColored ? coupon.color : (currency?.couponTextColor || '#000000'),
    borderColor: isColored ? coupon.color : (currency?.couponBorderColor || undefined),
    borderStyle: currency?.couponBorderStyle || 'dotted',
  };

  const fitKey = [
    coupon.code,
    coupon.category,
    coupon.teacher,
    coupon.value,
    coupon.startsAt,
    coupon.expiresAt,
    redemptionLabel,
    reusable,
    useQr,
    showBarcode,
    showDomain,
    title,
    cornerStyle,
  ] as const;

  return (
    <CouponBox
      style={style}
      fitKey={fitKey}
      className={cn(
        cornerStyle === 'rectangular'
          ? 'rounded-none print-coupon--rectangular'
          : cornerStyle === 'rounded'
            ? 'rounded-[0.75em] print-coupon--rounded'
            : 'rounded-[0.75em]',
        useQr && 'print-coupon--qr-scan',
        !isColored && !style.borderColor && 'border-slate-400 text-slate-800',
        (!style.backgroundColor || style.backgroundColor === '#ffffff') && 'bg-white',
      )}
      bodyClassName={compact ? 'px-[0.4em] py-[0.14em]' : 'px-[0.45em] py-[0.22em]'}
    >
      {isNew && (
        <div className="absolute top-[0.25em] right-[0.25em] z-[1] bg-primary/80 text-white text-[0.5625em] px-[0.375em] py-[0.125em] rounded-full font-bold leading-none">
          NEW
        </div>
      )}
      {reusable && (
        <div
          className="w-full shrink-0 rounded-[0.12em] bg-amber-400 px-[0.2em] py-[0.06em] text-center text-[0.2em] font-black uppercase leading-tight tracking-wide text-black"
          title="WARNING: Staff keep. Do not throw away."
        >
          Warning: staff keep — do not throw away
        </div>
      )}
      <CouponTitle text={title} compact={compact} />
      <div
        className={cn(
          'coupon-main w-full flex min-h-0 items-center shrink border-y',
          useQr ? 'gap-[0.3em] py-[0.05em] px-[0.02em]' : 'justify-center gap-[0.4em] py-[0.1em]',
          compact && !useQr && 'py-[0.06em]',
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
        <div className={cn('flex min-w-0 items-center', (useQr && showBarcode) ? 'min-w-0 flex-1 justify-start gap-[0.3em]' : 'justify-center gap-[0.4em] w-full')}>
          <div className="flex flex-col items-center leading-none shrink-0">
            <div className="flex items-center gap-[0.1em]">
              <span className="text-[1.05em] font-black leading-none" style={style.color ? { color: style.color } : { color: '#000' }}>
                {Number(coupon.value ?? 0)}
              </span>
              <span className="text-[0.7em]">{currency.icon}</span>
            </div>
            <span className="text-[0.4em] font-bold uppercase tracking-[0.16em] mt-[0.08em]">
              {currency.label}
            </span>
          </div>
          <div className="min-w-0 flex-1 text-left leading-snug overflow-hidden">
            <div className="font-bold italic text-[0.55em] leading-tight line-clamp-2 break-words">
              {coupon.category}
            </div>
            <div className={cn((isColored || style.color !== '#000000') ? 'opacity-80' : 'text-slate-600', 'leading-tight text-[0.4em] line-clamp-1 break-words')}>
              Issued by: {coupon.teacher}
            </div>
          </div>
        </div>
      </div>
      <div
        className={cn(
          'coupon-barcode-zone flex w-full min-h-0 min-w-0 flex-col items-center shrink gap-[0.02em]',
          compact ? 'mt-[0.02em]' : 'mt-[0.06em]',
        )}
      >
        {redemptionLabel && (
          <div
            className="coupon-redemption-label text-[0.22em] leading-tight font-bold text-center w-full max-w-full px-[0.1em] overflow-hidden text-ellipsis whitespace-nowrap"
            style={style.color ? { color: style.color } : { color: '#000' }}
            title={redemptionLabel}
          >
            {redemptionLabel}
          </div>
        )}
        {!useQr && showBarcode ? (
          <PrintIdCardScanCode
            value={coupon.code}
            variant="coupon"
            className={cn('coupon-barcode w-full max-w-full', hasDates && 'coupon-barcode--with-dates')}
          />
        ) : null}
        {hasDates && (
          <div
            className={cn(
              'coupon-dates w-full max-w-full overflow-hidden uppercase opacity-70 leading-none',
              bothDates
                ? 'flex flex-row flex-wrap items-center justify-center gap-x-[0.35em] gap-y-[0.02em] text-[0.26em]'
                : 'flex flex-col items-center gap-[0.02em] text-[0.28em]',
            )}
          >
            {hasStarts && (
              <span className="max-w-full truncate">
                {bothDates ? `Valid ${formatCouponDate(coupon.startsAt!)}` : `Valid from ${formatCouponDate(coupon.startsAt!)}`}
              </span>
            )}
            {hasExpires && (
              <span className="max-w-full truncate">
                {bothDates ? `Exp ${formatCouponDate(coupon.expiresAt!)}` : `Expires ${formatCouponDate(coupon.expiresAt!)}`}
              </span>
            )}
          </div>
        )}
      </div>
      {showDomain && (
        <PrintLevelUpDomain
          className={cn(
            'shrink-0 font-semibold uppercase tracking-[0.1em] opacity-60 leading-none overflow-hidden max-w-full truncate',
            compact ? 'mt-[0.02em] text-[0.22em]' : 'mt-[0.04em] text-[0.26em]',
          )}
        />
      )}
    </CouponBox>
  );
}
