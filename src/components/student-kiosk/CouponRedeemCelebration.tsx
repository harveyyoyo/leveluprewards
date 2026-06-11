'use client';

import { Sparkles, Ticket, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CouponRedeemCelebrationProps = {
  points: number;
  category: string;
  compliment?: string | null;
  animationKey: number;
};

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
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      aria-hidden="true"
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-md',
          'animate-in fade-in duration-300 motion-reduce:animate-none',
        )}
      />
      <div
        className={cn(
          'relative flex w-full max-w-xl flex-col items-center gap-5 rounded-3xl border-2 border-white/20',
          'bg-gradient-to-b from-slate-900/95 via-slate-900/95 to-slate-950/95',
          'px-6 py-8 shadow-2xl shadow-emerald-950/50 sm:gap-6 sm:px-10 sm:py-10',
          'animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 motion-reduce:animate-none',
        )}
      >
        <div className="absolute -top-px left-1/2 h-1 w-2/3 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-90" />

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/15 shadow-[0_0_24px_rgba(52,211,153,0.35)] sm:h-16 sm:w-16">
            <Ticket className="h-7 w-7 text-emerald-300 sm:h-8 sm:w-8" aria-hidden />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300/90 sm:text-sm">
            Coupon redeemed
          </p>
        </div>

        <p className="text-center text-5xl font-black tracking-tight text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)] sm:text-6xl md:text-7xl">
          +{points}
          <span className="ml-2 text-2xl font-black tracking-widest text-emerald-200/90 sm:text-3xl md:text-4xl">
            PTS
          </span>
        </p>

        {category ? (
          <span className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-black uppercase tracking-widest text-white sm:px-6 sm:text-base">
            {category}
          </span>
        ) : null}

        {trimmedCompliment ? (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-amber-300/30 bg-amber-500/10 px-5 py-5 text-center sm:px-6 sm:py-6">
            <Sparkles className="h-6 w-6 text-amber-300 sm:h-7 sm:w-7" aria-hidden />
            <p className="text-xl font-bold leading-snug text-amber-50 sm:text-2xl md:text-[1.75rem]">
              {trimmedCompliment}
            </p>
          </div>
        ) : null}

        <div className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-center sm:gap-4 sm:px-5 sm:py-5">
          <Trash2 className="h-6 w-6 shrink-0 text-white/85 sm:h-7 sm:w-7" aria-hidden />
          <p className="text-base font-bold leading-snug text-white sm:text-lg md:text-xl">
            Toss your coupon in the trash — thanks!
          </p>
        </div>
      </div>
    </div>
  );
}
