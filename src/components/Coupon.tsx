'use client';

import type { Coupon } from '@/lib/types';
import { couponRedemptionLabelForPrint } from '@/lib/couponRedemptionRules';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/appBranding';

export function Coupon({ coupon, schoolId, isNew = false }: { coupon: Coupon, schoolId?: string | null, isNew?: boolean }) {
  const { settings } = useSettings();
  const schoolName = schoolId ? schoolId.replace(/_/g, ' ') : null;
  const title = schoolName ? `${APP_NAME} - ${schoolName}` : APP_NAME;

  const isColored = settings.enableColorPrinting && coupon.color;
  const redemptionLabel = couponRedemptionLabelForPrint(coupon);
  const hasLimitLine = Boolean(redemptionLabel);

  const style = isColored ? {
    borderColor: coupon.color,
    color: coupon.color,
  } : {};

  return (
    <div
      style={style}
      className={cn(
        'coupon-scalable py-[0.22em] px-[0.45em] border border-dotted rounded-[0.75em] bg-white shadow-sm inline-flex flex-col items-center justify-between text-center h-[5em] w-[9.5em] relative overflow-hidden',
        !isColored && "border-slate-400 text-slate-800"
      )}
    >
      {isNew && (
        <div className="absolute top-[0.25em] right-[0.25em] bg-primary/80 text-white text-[0.5625em] px-[0.375em] py-[0.125em] rounded-full font-bold leading-none">
          NEW
        </div>
      )}
      <div className={cn('font-bold uppercase tracking-[0.18em] mb-[0.08em] leading-tight', hasLimitLine ? 'text-[0.5em]' : 'text-[0.5625em]')}>
        {title}
      </div>
      <div className={cn("w-full flex items-center justify-center gap-[0.45em] border-y shrink-0", hasLimitLine ? 'py-[0.08em]' : 'py-[0.125em]', isColored ? 'border-[currentColor]/30' : 'border-slate-200')}>
        <div className="flex flex-col items-center leading-none">
          <span className="text-[1.125em] font-black text-black leading-none">{coupon.value}</span>
          <span className="text-[0.4375em] font-bold uppercase tracking-[0.2em] mt-[0.125em]">
            Points
          </span>
        </div>
        <div className="text-left leading-snug">
          <div className="font-bold italic text-[0.6em] leading-tight">
            {coupon.category}
          </div>
          <div className={cn(isColored ? 'opacity-80' : 'text-slate-600', 'leading-tight text-[0.45em]')}>
            Issued by: {coupon.teacher}
          </div>
        </div>
      </div>
      <div className="coupon-barcode-zone flex flex-col items-center w-full mt-[0.06em] shrink-0 gap-[0.04em]">
        {redemptionLabel && (
          <div
            className="coupon-redemption-label text-[0.24em] leading-tight text-black font-bold text-center w-full max-w-full px-[0.1em] overflow-hidden text-ellipsis whitespace-nowrap"
            title={redemptionLabel}
          >
            {redemptionLabel}
          </div>
        )}
        <div
          className={cn(
            'coupon-barcode font-barcode leading-none text-black tracking-wider max-w-full whitespace-nowrap',
            hasLimitLine ? 'text-[1.02em]' : 'text-[1.22em]'
          )}
        >
          *{coupon.code}*
        </div>
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
    </div>
  );
}
