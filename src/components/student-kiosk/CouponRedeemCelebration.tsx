'use client';

import { Sparkles, Ticket, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CouponRedeemCelebrationProps = {
  points: number;
  category: string;
  compliment?: string | null;
  animationKey: number;
};

/** Redeem message card — sits directly above the scan panel in the center column. */
export function CouponRedeemCelebration({
  points,
  category,
  compliment,
  animationKey,
}: CouponRedeemCelebrationProps) {
  const trimmedCompliment = compliment?.trim();

  return (
    <div
      key={animationKey}
      className={cn(
        'w-full min-w-0',
        'rounded-2xl border border-white/20',
        'bg-gradient-to-b from-slate-900/96 to-slate-950/96',
        'px-4 py-3 shadow-xl shadow-emerald-950/35 sm:rounded-3xl sm:px-5 sm:py-4',
        'animate-in fade-in slide-in-from-top-3 duration-400 motion-reduce:animate-none',
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
        <Ticket className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300/95 sm:text-xs">
          Coupon redeemed
        </p>
        {category ? (
          <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white sm:text-[10px]">
            {category}
          </span>
        ) : null}
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 sm:text-xs">
          +{points} pts
        </span>
      </div>

      {trimmedCompliment ? (
        <div className="mt-2 flex items-start justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-center sm:mt-2.5 sm:px-4 sm:py-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          <p className="text-sm font-bold leading-snug text-amber-50 sm:text-[0.95rem]">
            {trimmedCompliment}
          </p>
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-center gap-2 text-center sm:mt-2.5">
        <Trash2 className="h-4 w-4 shrink-0 text-white/80" aria-hidden />
        <p className="text-xs font-semibold leading-snug text-white/90 sm:text-sm">
          Toss your coupon in the trash — thanks!
        </p>
      </div>
    </div>
  );
}
