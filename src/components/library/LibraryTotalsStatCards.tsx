'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LibraryTheme } from '@/lib/library/libraryThemes';

export type LibraryCatalogStatFilter = 'all' | 'available' | 'checked_out' | 'overdue';

export interface LibraryTotalsStatCardsProps {
  copiesCount: number;
  availableCopiesCount: number;
  activeLoansCount: number;
  overdueLoansCount: number;
  animated?: boolean;
  isNightDesk: boolean;
  isReadingRoom: boolean;
  currentTheme: LibraryTheme;
  activeFilter?: LibraryCatalogStatFilter;
  onViewCatalog: (statusFilter?: LibraryCatalogStatFilter) => void;
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

function cardSurfaceClass(
  isNightDesk: boolean,
  isReadingRoom: boolean,
  currentTheme: LibraryTheme,
  hoverBorder: string,
) {
  if (isNightDesk) return 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-white';
  if (isReadingRoom) return 'border-stone-300 bg-stone-50/90 hover:border-stone-400 text-stone-900';
  return cn(currentTheme.classes.card, hoverBorder);
}

function StatCard({
  selected,
  selectedRing,
  surfaceClass,
  onClick,
  label,
  labelClass,
  icon,
  iconClass,
  value,
  valueClass,
  hint,
}: {
  selected: boolean;
  selectedRing: string;
  surfaceClass: string;
  onClick: () => void;
  label: string;
  labelClass?: string;
  icon: ReactNode;
  iconClass: string;
  value: number;
  valueClass?: string;
  hint: string;
}) {
  return (
    <motion.button
      type="button"
      layout
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'group rounded-xl border px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center gap-2 text-left transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
        surfaceClass,
        selected && cn('ring-2 ring-offset-1 shadow-md', selectedRing),
      )}
    >
      <div className="min-w-0 flex-1">
        <span className={cn('text-[10px] font-black uppercase tracking-wider text-muted-foreground', labelClass)}>
          {label}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className={cn('text-base sm:text-lg font-black tracking-tight leading-none', valueClass)}>{value}</span>
          <span className="min-w-0 truncate text-[10px] text-muted-foreground font-medium">{hint}</span>
        </div>
      </div>
      <div
        className={cn(
          'h-6 w-6 shrink-0 rounded-md flex items-center justify-center transition-transform group-hover:scale-110',
          iconClass,
        )}
      >
        {icon}
      </div>
    </motion.button>
  );
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
  activeFilter,
  onViewCatalog,
}: LibraryTotalsStatCardsProps) {
  const animCopies = useCountUp(copiesCount, 900, animated);
  const animAvailable = useCountUp(availableCopiesCount, 900, animated);
  const animLoans = useCountUp(activeLoansCount, 900, animated);
  const animOverdue = useCountUp(overdueLoansCount, 900, animated);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatCard
        selected={activeFilter === 'all'}
        selectedRing="ring-blue-500/50"
        surfaceClass={cardSurfaceClass(isNightDesk, isReadingRoom, currentTheme, 'hover:border-blue-500/40')}
        onClick={() => onViewCatalog('all')}
        label="Total Catalog"
        icon={<BookOpen className="h-3.5 w-3.5" />}
        iconClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        value={animCopies}
        hint="Physical books in library"
      />
      <StatCard
        selected={activeFilter === 'available'}
        selectedRing="ring-emerald-500/50"
        surfaceClass={cardSurfaceClass(isNightDesk, isReadingRoom, currentTheme, 'hover:border-emerald-500/40')}
        onClick={() => onViewCatalog('available')}
        label="On Shelf Today"
        labelClass="text-emerald-600 dark:text-emerald-400"
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        value={animAvailable}
        valueClass="text-emerald-600 dark:text-emerald-400"
        hint="Ready for immediate loan"
      />
      <StatCard
        selected={activeFilter === 'checked_out'}
        selectedRing="ring-amber-500/50"
        surfaceClass={cardSurfaceClass(isNightDesk, isReadingRoom, currentTheme, 'hover:border-amber-500/40')}
        onClick={() => onViewCatalog('checked_out')}
        label="Active Loans"
        labelClass="text-amber-600 dark:text-amber-400"
        icon={<Clock className="h-3.5 w-3.5" />}
        iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        value={animLoans}
        hint="Currently with students"
      />
      <StatCard
        selected={activeFilter === 'overdue'}
        selectedRing="ring-rose-500/50"
        surfaceClass={
          overdueLoansCount > 0
            ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50'
            : cardSurfaceClass(isNightDesk, isReadingRoom, currentTheme, 'hover:border-rose-500/40')
        }
        onClick={() => onViewCatalog('overdue')}
        label="Overdue"
        labelClass={overdueLoansCount > 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
        icon={<AlertTriangle className="h-3.5 w-3.5" />}
        iconClass={
          overdueLoansCount > 0
            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
            : 'bg-muted text-muted-foreground'
        }
        value={animOverdue}
        valueClass={overdueLoansCount > 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
        hint={overdueLoansCount > 0 ? 'Reminders needed' : 'All loans on schedule'}
      />
    </div>
  );
}
