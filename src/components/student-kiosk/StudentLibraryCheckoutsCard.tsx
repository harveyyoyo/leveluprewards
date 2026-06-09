'use client';

import Link from 'next/link';
import { AlertTriangle, BookOpen, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LibraryItem } from '@/lib/types';
import {
  computeDaysOverdue,
  formatDueDate,
  type LibraryPolicySettings,
} from '@/lib/library/libraryPolicy';

export function StudentLibraryCheckoutsCard({
  schoolId,
  items,
  themed,
  topAlert = false,
  kioskCheckoutEnabled = false,
  maxCheckouts,
  libraryPolicy,
  libraryPoints,
  libraryFineBalance,
  categoryPoints,
}: {
  schoolId: string;
  items: LibraryItem[];
  themed?: boolean;
  /** Emphasize overdue returns at top of kiosk. */
  topAlert?: boolean;
  /** Student can return by scanning the book barcode on the coupon card. */
  kioskCheckoutEnabled?: boolean;
  maxCheckouts?: number;
  libraryPolicy?: LibraryPolicySettings;
  libraryPoints?: number;
  libraryFineBalance?: number;
  categoryPoints?: number;
}) {
  const max = maxCheckouts && maxCheckouts > 0 ? maxCheckouts : null;
  const countLabel = max ? `${items.length} / ${max}` : String(items.length);
  const hasOverdue = items.some((i) => computeDaysOverdue(i.dueAt) > 0);
  const showOverdueHeader = topAlert && hasOverdue;
  const atLimit = max != null && items.length >= max;

  const tierLines: string[] = [];
  if (libraryPolicy?.rewardMode === 'isolated_points' && typeof libraryPoints === 'number') {
    tierLines.push(`Library points: ${libraryPoints}`);
  }
  if (libraryPolicy?.rewardMode === 'fines' && typeof libraryFineBalance === 'number' && libraryFineBalance > 0) {
    tierLines.push(`Fines: ${libraryFineBalance}`);
  }
  if (
    libraryPolicy?.rewardMode === 'app_points' &&
    libraryPolicy.pointsCategoryName &&
    typeof categoryPoints === 'number'
  ) {
    tierLines.push(`${libraryPolicy.pointsCategoryName}: ${categoryPoints} pts`);
  }

  return (
    <Card
      className={cn(
        'shrink-0 border-2 shadow-md',
        showOverdueHeader && 'w-full border-amber-400/70 bg-amber-50/95 dark:border-amber-500/50 dark:bg-amber-950/40',
        atLimit && !showOverdueHeader && 'border-amber-400/50',
        !topAlert && !themed && !showOverdueHeader && 'border-primary/30 bg-card/95',
      )}
      style={
        themed && !showOverdueHeader
          ? {
              borderColor: 'color-mix(in srgb, var(--theme-primary) 35%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--theme-card) 94%, white)',
            }
          : themed && showOverdueHeader
            ? {
                borderColor: 'color-mix(in srgb, var(--theme-primary) 45%, #f59e0b)',
                backgroundColor: 'color-mix(in srgb, #fef3c7 88%, var(--theme-card))',
              }
            : undefined
      }
    >
      <CardHeader className={cn('py-3 px-4', showOverdueHeader && 'pb-2')}>
        <CardTitle
          className={cn(
            'text-sm font-black uppercase tracking-wider flex items-center gap-2',
            showOverdueHeader && 'text-amber-950 dark:text-amber-100',
          )}
        >
          {showOverdueHeader ? (
            <AlertTriangle
              className={cn('h-4 w-4', 'text-amber-600')}
              aria-hidden
            />
          ) : (
            <BookOpen className="h-4 w-4 text-primary" aria-hidden />
          )}
          {showOverdueHeader ? 'Overdue library books — return now' : 'My library books'}
          <Badge
            variant={showOverdueHeader || atLimit ? 'destructive' : 'secondary'}
            className="ml-auto text-[10px]"
          >
            {countLabel}
          </Badge>
        </CardTitle>
        {tierLines.length > 0 ? (
          <p className="text-[10px] text-muted-foreground font-semibold pt-1">{tierLines.join(' · ')}</p>
        ) : null}
        {atLimit && !showOverdueHeader ? (
          <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-200 pt-1">
            Checkout limit reached — return a book before borrowing another.
          </p>
        ) : null}
      </CardHeader>
      <CardContent
        className={cn(
          'px-4 pb-4 pt-0 space-y-2',
          items.length === 0 ? '' : showOverdueHeader ? 'max-h-36 overflow-y-auto' : 'max-h-48 overflow-y-auto',
        )}
      >
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {kioskCheckoutEnabled
              ? 'No books checked out. Scan a book barcode at the coupon scanner to borrow one.'
              : 'No books checked out right now.'}
          </p>
        ) : null}
        {items.map((item) => {
          const overdueDays = computeDaysOverdue(item.dueAt);
          return (
            <Link
              key={item.id}
              href={`/${schoolId}/library/book?code=${encodeURIComponent(item.upc)}`}
              className={cn(
                'block rounded-xl border px-3 py-2 transition-colors hover:bg-muted/50',
                overdueDays > 0
                  ? 'border-amber-400/60 bg-amber-50/80 dark:bg-amber-950/30'
                  : 'border-border/60 bg-muted/20',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  {item.author ? (
                    <p className="text-[10px] text-muted-foreground truncate">{item.author}</p>
                  ) : null}
                </div>
                {overdueDays > 0 ? (
                  <Badge variant="destructive" className="shrink-0 text-[9px] gap-0.5">
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    {overdueDays}d late
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                {overdueDays > 0 ? `Was due ${formatDueDate(item.dueAt)}` : `Due ${formatDueDate(item.dueAt)}`}
              </p>
              {kioskCheckoutEnabled ? (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {overdueDays > 0
                    ? 'Scan this book at the coupon scanner to return'
                    : 'Scan the book barcode at the coupon card to return · tap for details'}
                </p>
              ) : topAlert ? (
                <p className="text-[10px] font-semibold text-amber-900/80 dark:text-amber-200/90 mt-0.5">
                  Return this book at the library desk
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-0.5">Tap to open book details</p>
              )}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
