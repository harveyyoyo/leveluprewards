'use client';

import { BookOpen, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { computeDaysOverdue, formatDueDate, type LibraryPolicySettings } from '@/lib/library/libraryPolicy';
import type { LibraryItem } from '@/lib/types';
import { LibraryBookCover } from './LibraryBookCover';
import { cn } from '@/lib/utils';

export function LibraryStudentLoansSummary({
  items,
  maxCheckouts,
  libraryPolicy,
  libraryPoints,
  libraryFineBalance,
  categoryPoints,
  compact = false,
  staffActions,
}: {
  items: LibraryItem[];
  maxCheckouts?: number;
  libraryPolicy?: LibraryPolicySettings;
  libraryPoints?: number;
  libraryFineBalance?: number;
  categoryPoints?: number;
  compact?: boolean;
  staffActions?: {
    busyId?: string | null;
    onRenew?: (item: LibraryItem) => void;
    onReturn?: (item: LibraryItem) => void;
  };
}) {
  const isUnlimited = maxCheckouts === 0;
  const max = maxCheckouts && maxCheckouts > 0 ? maxCheckouts : null;
  const countLabel = isUnlimited
    ? `${items.length} book${items.length === 1 ? '' : 's'} (Unlimited)`
    : max
    ? `${items.length} / ${max} books`
    : `${items.length} book${items.length === 1 ? '' : 's'}`;

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
        'w-full rounded-2xl border-2 bg-background/90 shadow-sm space-y-2.5',
        compact ? 'px-3 py-2' : 'px-4 py-3.5 sm:px-5 sm:py-4',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            'font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5',
            compact ? 'text-xs' : 'text-xs sm:text-sm',
          )}
        >
          <BookOpen className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'} aria-hidden />
          Current checkouts
        </p>
        <Badge variant="secondary" className={cn('font-black', compact ? 'text-[10px]' : 'text-xs sm:text-sm px-2.5 py-1')}>
          {countLabel}
        </Badge>
      </div>

      {tierLines.length > 0 ? (
        <p className={cn('text-muted-foreground font-medium', compact ? 'text-[11px]' : 'text-xs sm:text-sm')}>
          {tierLines.join(' · ')}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm sm:text-base py-1')}>
          No books checked out — scan a book barcode to borrow.
        </p>
      ) : (
        <ul className={cn('space-y-2', compact ? 'max-h-28 overflow-y-auto' : 'max-h-64 overflow-y-auto')}>
          {items.map((item) => {
            const overdueDays = computeDaysOverdue(item.dueAt);
            return (
              <li
                key={item.id}
                className={cn(
                  'rounded-xl border flex items-center gap-3',
                  compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2.5 text-sm sm:text-base',
                  overdueDays > 0
                    ? 'border-amber-400/60 bg-amber-50/80 dark:bg-amber-950/30'
                    : 'border-border/60 bg-muted/20',
                )}
              >
                <LibraryBookCover
                  coverUrl={item.coverUrl}
                  isbn={item.isbn}
                  title={item.name}
                  author={item.author}
                  aspect="thumb"
                  className={cn('shrink-0 rounded-lg border shadow-xs', compact ? 'h-9 w-6' : 'h-16 w-11 sm:h-20 sm:w-14')}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold truncate">{item.name}</span>
                    {overdueDays > 0 ? (
                      <Badge
                        variant="destructive"
                        className={cn('shrink-0 font-bold', compact ? 'text-[9px] px-1 py-0' : 'text-xs px-1.5 py-0.5')}
                      >
                        {overdueDays}d late
                      </Badge>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      'mt-0.5 flex items-center gap-1 text-muted-foreground',
                      compact ? 'text-[10px]' : 'text-xs sm:text-sm',
                    )}
                  >
                    <Calendar className={compact ? 'h-2.5 w-2.5 shrink-0' : 'h-3.5 w-3.5 shrink-0'} aria-hidden />
                    {overdueDays > 0 ? `Was due ${formatDueDate(item.dueAt)}` : `Due ${formatDueDate(item.dueAt)}`}
                  </p>
                  {staffActions && !compact ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={staffActions.busyId === item.id}
                        onClick={() => staffActions.onRenew?.(item)}
                        className="h-7 rounded-lg px-2.5 text-[11px] font-bold"
                      >
                        Give more time
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={staffActions.busyId === item.id}
                        onClick={() => staffActions.onReturn?.(item)}
                        className="h-7 rounded-lg px-2.5 text-[11px] font-bold"
                      >
                        Return now
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
