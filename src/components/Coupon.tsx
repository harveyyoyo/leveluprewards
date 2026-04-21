'use client';

import type { CSSProperties } from 'react';
import type { Coupon } from '@/lib/types';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/app-branding';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';

/** Squeeze long school names to one line inside the coupon width. */
function couponSchoolLineStyle(school: string): CSSProperties {
  const n = school.trim().length;
  if (n <= 22) return { lineHeight: 1.12 };
  if (n <= 34) return { fontSize: '0.48em', lineHeight: 1.1, letterSpacing: '0.06em', transform: 'scaleX(0.97)', transformOrigin: 'center top' };
  if (n <= 48) return { fontSize: '0.4em', lineHeight: 1.08, letterSpacing: '0.04em', transform: 'scaleX(0.92)', transformOrigin: 'center top' };
  return { fontSize: '0.34em', lineHeight: 1.06, letterSpacing: '0.02em', transform: 'scaleX(0.86)', transformOrigin: 'center top' };
}

export function Coupon({
  coupon,
  schoolId,
  schoolName: passedSchoolName,
  isNew = false,
  className,
}: {
  coupon: Coupon;
  schoolId?: string | null;
  schoolName?: string | null;
  isNew?: boolean;
  className?: string;
}) {
  const { settings } = useSettings();
  const firestore = useFirestore();
  const schoolDocRef = useMemoFirebase(() => (!passedSchoolName && firestore && schoolId ? doc(firestore, 'schools', schoolId) : null), [passedSchoolName, firestore, schoolId]);
  const { data: schoolData } = useDoc<{ name?: string }>(schoolDocRef);

  const fallbackSchoolName = schoolId ? schoolId.replace(/_/g, ' ') : null;
  const schoolName = passedSchoolName || schoolData?.name || fallbackSchoolName;
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
        !isColored && "border-slate-400 text-slate-800",
        className
      )}
    >
      {isNew && (
        <div className="absolute top-[0.25em] right-[0.25em] bg-primary/80 text-white text-[0.5625em] px-[0.375em] py-[0.125em] rounded-full font-bold leading-none">
          NEW
        </div>
      )}
      <div className="mb-[0.125em] w-full max-w-full min-w-0 px-[0.1em] flex flex-col items-center gap-[0.06em] leading-tight">
        {schoolName ? (
          <>
            <div
              className={cn(
                'text-[0.34em] font-bold uppercase tracking-[0.14em] max-w-full truncate',
                !isColored && 'text-slate-700'
              )}
            >
              {APP_NAME}
            </div>
            <div
              className="text-[0.5625em] font-bold uppercase tracking-[0.12em] max-w-full whitespace-nowrap overflow-hidden text-ellipsis"
              style={couponSchoolLineStyle(String(schoolName))}
            >
              {schoolName}
            </div>
          </>
        ) : (
          <div className="text-[0.5625em] font-bold uppercase tracking-[0.18em] max-w-full whitespace-nowrap overflow-hidden text-ellipsis">
            {APP_NAME}
          </div>
        )}
      </div>
      <div
        className={cn(
          'coupon-print-middle-band w-full flex items-center justify-center gap-[0.5em] border-y py-[0.125em]',
          isColored ? 'border-[currentColor]/30' : 'border-slate-200'
        )}
      >
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
      <div className="flex flex-col items-center w-full mt-[0.22em]">
        <div className="font-barcode text-[1.25em] leading-none text-black tracking-wider max-w-full overflow-hidden flex items-end pt-[0.06em]">
          *{coupon.code}*
        </div>
        {coupon.expiresAt && (
          <div className="text-[0.35em] mt-[0.125em] uppercase tracking-[0.18em] opacity-70 leading-none">
            Expires {new Date(coupon.expiresAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
