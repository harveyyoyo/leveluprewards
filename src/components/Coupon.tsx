'use client';

import type { Coupon } from '@/lib/types';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/app-branding';

export function Coupon({ coupon, schoolId, isNew = false }: { coupon: Coupon, schoolId?: string | null, isNew?: boolean }) {
  const { settings } = useSettings();
  const schoolName = schoolId ? schoolId.replace(/_/g, ' ') : null;
  const title = schoolName ? `${APP_NAME} - ${schoolName}` : APP_NAME;

  const isColored = settings.enableColorPrinting && coupon.color;

  const style = isColored ? {
    borderColor: coupon.color,
    color: coupon.color,
  } : {};

  return (
    <div
      style={style}
      className={cn(
        "coupon-scalable py-[0.25em] px-[0.5em] border border-dotted rounded-[0.75em] bg-white shadow-sm inline-flex flex-col items-center justify-between text-center h-[5em] w-[9.5em] relative overflow-hidden",
        !isColored && "border-slate-400 text-slate-800"
      )}
    >
      {isNew && (
        <div className="absolute top-[0.25em] right-[0.25em] bg-primary/80 text-white text-[0.5625em] px-[0.375em] py-[0.125em] rounded-full font-bold leading-none">
          NEW
        </div>
      )}
      <div className="text-[0.5625em] font-bold uppercase tracking-[0.18em] mb-[0.125em] leading-tight">
        {title}
      </div>
      <div className={cn("w-full flex items-center justify-center gap-[0.5em] border-y py-[0.125em]", isColored ? 'border-[currentColor]/30' : 'border-slate-200')}>
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
      <div className="flex flex-col items-center w-full mt-[0.125em]">
        <div className="font-barcode text-[1.25em] leading-none text-black tracking-wider max-w-full overflow-hidden flex items-end">
          *{coupon.code}*
        </div>
        {(coupon.startsAt || coupon.expiresAt) && (
          <div className="text-[0.35em] mt-[0.125em] uppercase tracking-[0.18em] opacity-70 leading-none flex flex-col gap-[0.125em]">
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
