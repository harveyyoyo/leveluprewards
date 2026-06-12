'use client';

import { cn } from '@/lib/utils';

type OfficeLoadingRowsProps = {
  rows?: number;
  cols?: number;
  className?: string;
};

export function OfficeLoadingRows({ rows = 5, cols = 4, className }: OfficeLoadingRowsProps) {
  return (
    <div className={cn('space-y-2', className)} aria-busy aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((__, j) => (
            <div
              key={j}
              className="h-9 flex-1 animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
