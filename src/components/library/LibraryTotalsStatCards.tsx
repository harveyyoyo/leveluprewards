'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LibraryTheme } from '@/lib/library/libraryThemes';

export interface LibraryTotalsStatCardsProps {
  copiesCount: number;
  availableCopiesCount: number;
  activeLoansCount: number;
  overdueLoansCount: number;
  animated?: boolean;
  isNightDesk: boolean;
  isReadingRoom: boolean;
  currentTheme: LibraryTheme;
  onViewCatalog: (statusFilter?: 'available' | 'checked_out') => void;
  onViewLoans?: (subTab: 'active' | 'overdue') => void;
}

// Count-up animation hook (matches the welcome page pattern)
function useCountUp(target: number, duration = 900, enabled = true): number {
  const [current, setCurrent] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!enabled || hasAnimated.current || target === 0) {
      setCurrent(target);
      return;
    }
    hasAnimated.current = true;
    const startTime = performance.now();
    let rafId: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, enabled]);

  return current;
}

export function LibraryTotalsStatCards({
  copiesCount,
  availableCopiesCount,
  activeLoansCount,
  overdueLoansCount,
  animated = true,
  isNightDesk,
  isReadingRoom,
  currentTheme,
  onViewCatalog,
  onViewLoans,
}: LibraryTotalsStatCardsProps) {
  const animCopies = useCountUp(copiesCount, 900, animated);
  const animAvailable = useCountUp(availableCopiesCount, 900, animated);
  const animLoans = useCountUp(activeLoansCount, 900, animated);
  const animOverdue = useCountUp(overdueLoansCount, 900, animated);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
      <button
        type="button"
        onClick={() => onViewCatalog()}
        className={cn(
          'group rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between text-left transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
          isNightDesk
            ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-white'
            : isReadingRoom
              ? 'border-stone-300 bg-stone-50/90 hover:border-stone-400 text-stone-900'
              : cn(currentTheme.classes.card, 'hover:border-blue-500/40'),
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Total Catalog
          </span>
          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-transform group-hover:scale-110">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-lg sm:text-xl font-black tracking-tight">{animCopies}</div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 font-medium">
            <span>Physical books in library</span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onViewCatalog('available')}
        className={cn(
          'group rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between text-left transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
          isNightDesk
            ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-white'
            : isReadingRoom
              ? 'border-stone-300 bg-stone-50/90 hover:border-stone-400 text-stone-900'
              : cn(currentTheme.classes.card, 'hover:border-emerald-500/40'),
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            On Shelf Today
          </span>
          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-110">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {animAvailable}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 font-medium">
            <span>Ready for immediate loan</span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onViewLoans?.('active')}
        className={cn(
          'group rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between text-left transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
          isNightDesk
            ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-white'
            : isReadingRoom
              ? 'border-stone-300 bg-stone-50/90 hover:border-stone-400 text-stone-900'
              : cn(currentTheme.classes.card, 'hover:border-amber-500/40'),
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Active Loans
          </span>
          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-transform group-hover:scale-110">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-lg sm:text-xl font-black tracking-tight">{animLoans}</div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 font-medium">
            <span>Currently with students</span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onViewLoans?.('overdue')}
        className={cn(
          'group rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between text-left transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
          overdueLoansCount > 0
            ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50'
            : isNightDesk
              ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-white'
              : isReadingRoom
                ? 'border-stone-300 bg-stone-50/90 hover:border-stone-400 text-stone-900'
                : cn(currentTheme.classes.card, 'hover:border-rose-500/40'),
        )}
      >
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-[10px] font-black uppercase tracking-wider',
              overdueLoansCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
            )}
          >
            Overdue
          </span>
          <div
            className={cn(
              'h-6 w-6 sm:h-7 sm:w-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110',
              overdueLoansCount > 0
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-1.5">
          <div
            className={cn(
              'text-lg sm:text-xl font-black tracking-tight',
              overdueLoansCount > 0 ? 'text-rose-600 dark:text-rose-400' : '',
            )}
          >
            {animOverdue}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 font-medium">
            <span>{overdueLoansCount > 0 ? 'Reminders needed' : 'All loans on schedule'}</span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
          </div>
        </div>
      </button>
    </div>
  );
}
