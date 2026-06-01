'use client';

import { Timer } from 'lucide-react';
import type { BathroomPassActive } from '@/lib/types';
import { formatBathroomElapsed, isBathroomOverLimit } from '@/lib/bathroom/formatBathroomElapsed';
import { cn } from '@/lib/utils';

type BathroomPassesBarProps = {
  passes: BathroomPassActive[];
  maxMinutes: number;
  classStudentIds?: Set<string>;
  onReturn: (studentId: string) => void;
};

export function BathroomPassesBar({
  passes,
  maxMinutes,
  classStudentIds,
  onReturn,
}: BathroomPassesBarProps) {
  const filtered =
    classStudentIds && classStudentIds.size > 0
      ? passes.filter((p) => classStudentIds.has(p.studentId))
      : passes;

  if (filtered.length === 0) return null;

  const now = Date.now();

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-900 dark:text-violet-100">
        <Timer className="h-3.5 w-3.5" aria-hidden />
        Out now
      </span>
      {filtered.map((pass) => {
        const elapsed = now - (pass.startedAt || now);
        const over = isBathroomOverLimit(elapsed, maxMinutes);
        return (
          <button
            key={pass.studentId}
            type="button"
            onClick={() => onReturn(pass.studentId)}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs font-bold shadow-sm transition-colors',
              over
                ? 'border-red-500/50 bg-red-500/15 text-red-950 dark:text-red-50'
                : 'border-violet-500/40 bg-background/80 text-foreground hover:bg-violet-500/15',
            )}
            title="Click when student returns"
          >
            {pass.studentName || pass.studentId}
            <span className={cn('ml-1.5 font-mono tabular-nums', over && 'text-red-600 dark:text-red-300')}>
              {formatBathroomElapsed(elapsed)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
