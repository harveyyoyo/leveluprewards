'use client';

import { Book, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LibraryItem } from '@/lib/types';
import { computeDaysOverdue, formatDueDate } from '@/lib/libraryPolicy';

/**
 * Student portal "My Books" card – shows the student's currently
 * checked-out library books with due dates and overdue warnings.
 * Re-uses the same data shape and policy helpers as the kiosk card
 * but is styled for the at-home portal (no scan/tap prompts).
 */
export function StudentPortalMyBooksCard({
  items,
  isLoading,
}: {
  items: LibraryItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" aria-hidden />
            My library books
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  const overdueItems = items.filter((i) => computeDaysOverdue(i.dueAt) > 0);
  const onTimeItems = items.filter((i) => computeDaysOverdue(i.dueAt) <= 0);

  return (
    <Card className={overdueItems.length > 0 ? 'border-amber-300/60' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Book className="h-5 w-5 text-primary" aria-hidden />
          My library books
          {items.length > 0 ? (
            <Badge variant="secondary" className="ml-auto tabular-nums">
              {items.length}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          {items.length === 0
            ? 'You have no books checked out right now.'
            : overdueItems.length > 0
              ? `${overdueItems.length} book${overdueItems.length > 1 ? 's' : ''} overdue — please return ${overdueItems.length > 1 ? 'them' : 'it'} at school.`
              : 'Return books at the school library or kiosk before the due date.'}
        </CardDescription>
      </CardHeader>
      {items.length > 0 ? (
        <CardContent className="space-y-2 pt-0">
          {/* Overdue items first */}
          {[...overdueItems, ...onTimeItems].map((item) => {
            const overdueDays = computeDaysOverdue(item.dueAt);
            const isOverdue = overdueDays > 0;
            return (
              <div
                key={item.id}
                className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 ${
                  isOverdue
                    ? 'border-amber-400/60 bg-amber-50/80 dark:bg-amber-950/30'
                    : 'border-border/60 bg-muted/20'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  {item.author ? (
                    <p className="text-[10px] text-muted-foreground truncate">{item.author}</p>
                  ) : null}
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                    Due {formatDueDate(item.dueAt)}
                  </p>
                </div>
                {isOverdue ? (
                  <Badge variant="destructive" className="shrink-0 text-[9px] gap-0.5">
                    <AlertTriangle className="h-3 w-3" />
                    {overdueDays}d overdue
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-[9px]">
                    Checked out
                  </Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      ) : null}
    </Card>
  );
}
