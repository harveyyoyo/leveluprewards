'use client';

import { BookOpen, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { computeDaysOverdue, formatDueDate, type LibraryPolicySettings } from '@/lib/library/libraryPolicy';
import type { LibraryItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export function LibraryStudentLoansSummary({
  items,
  maxCheckouts,
  libraryPolicy,
  libraryPoints,
  libraryFineBalance,
  categoryPoints,
  compact = false,
}: {
  items: LibraryItem[];
  maxCheckouts?: number;
  libraryPolicy?: LibraryPolicySettings;
  libraryPoints?: number;
  libraryFineBalance?: number;
  categoryPoints?: number;
  compact?: boolean;
}) {
  const max = maxCheckouts && maxCheckouts > 0 ? maxCheckouts : null;
  const countLabel = max ? `${items.length} / ${max} books` : `${items.length} book${items.length === 1 ? '' : 's'}`;

  const tierLines: string[] = [];
  if (libraryPolicy?.rewardMode === 'isolated_points' && typeof libraryPoints === 'number') {
    tierLines.push(`Library points: ${libraryPoints}`);
  }
  if (libraryPolicy?.rewardMode === 'fines' && typeof libraryFineBalance === 'number' && libraryFineBalance > 0) {
    tierLines.push(`Library fines: ${libraryFineBalance}`);
  }
  if (
    libraryPolicy?.rewardMode === 'app_points' &&
    libraryPolicy.pointsCategoryName &&
    typeof categoryPoints === 'number'
  ) {
    tierLines.push(`${libraryPolicy.pointsCategoryName}: ${categoryPoints} pts`);
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-background/80 space-y-2',
        compact ? 'px-3 py-2' : 'px-4 py-3',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Current checkouts
        </p>
        <Badge variant="secondary" className="text-[10px] font-bold">
          {countLabel}
        </Badge>
      </div>

      {tierLines.length > 0 ? (
        <p className="text-[11px] text-muted-foreground font-medium">{tierLines.join(' · ')}</p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No books checked out — scan a book barcode to borrow.</p>
      ) : (
        <ul className={cn('space-y-1.5', compact ? 'max-h-28 overflow-y-auto' : 'max-h-40 overflow-y-auto')}>
          {items.map((item) => {
            const overdueDays = computeDaysOverdue(item.dueAt);
            return (
              <li
                key={item.id}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 text-xs',
                  overdueDays > 0
                    ? 'border-amber-400/60 bg-amber-50/80 dark:bg-amber-950/30'
                    : 'border-border/60 bg-muted/20',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold truncate">{item.name}</span>
                  {overdueDays > 0 ? (
                    <Badge variant="destructive" className="shrink-0 text-[9px]">
                      {overdueDays}d late
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                  {overdueDays > 0 ? `Was due ${formatDueDate(item.dueAt)}` : `Due ${formatDueDate(item.dueAt)}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
