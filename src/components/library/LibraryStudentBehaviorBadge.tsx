import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudentLibraryStanding } from '@/lib/library/libraryBehavior';

export function LibraryStudentBehaviorBadge({
  standing,
  compact = false,
  className,
}: {
  standing: StudentLibraryStanding;
  compact?: boolean;
  className?: string;
}) {
  const getIcon = () => {
    switch (standing.level) {
      case 'exemplary':
        return <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />;
      case 'good':
        return <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-700 dark:text-sky-300" aria-hidden />;
      case 'warning':
        return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-800 dark:text-amber-300" aria-hidden />;
      case 'restricted':
        return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-800 dark:text-rose-300" aria-hidden />;
    }
  };

  const getStyleClass = () => {
    switch (standing.badgeTone) {
      case 'emerald':
        return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200';
      case 'blue':
        return 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-200';
      case 'amber':
        return 'border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-200';
      case 'rose':
        return 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-200';
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        compact ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm',
        getStyleClass(),
        className,
      )}
      title={standing.summary}
    >
      {getIcon()}
      <span>{standing.label}</span>
      {standing.overdueCount > 0 && !compact && (
        <span className="ml-1 rounded bg-rose-200/80 px-1 text-[10px] font-bold text-rose-900 dark:bg-rose-900/60 dark:text-rose-100">
          {standing.overdueCount} overdue
        </span>
      )}
    </div>
  );
}
