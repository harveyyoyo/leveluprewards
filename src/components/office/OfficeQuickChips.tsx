'use client';

import { cn } from '@/lib/utils';

type OfficeQuickChipsProps = {
  label?: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  className?: string;
};

/** Compact pill row for common grade subjects, letter grades, etc. */
export function OfficeQuickChips({ label, options, value, onSelect, className }: OfficeQuickChipsProps) {
  if (options.length === 0) return null;
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <p className="text-[0.625rem] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              value === opt
                ? 'border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
