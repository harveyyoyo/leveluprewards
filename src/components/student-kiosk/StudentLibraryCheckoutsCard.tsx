'use client';

import Link from 'next/link';
import { AlertTriangle, Book, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LibraryItem } from '@/lib/types';
import { computeDaysOverdue, formatDueDate } from '@/lib/libraryPolicy';

export function StudentLibraryCheckoutsCard({
  schoolId,
  items,
  themed,
}: {
  schoolId: string;
  items: LibraryItem[];
  themed?: boolean;
}) {
  if (items.length === 0) {
    return (
      <Card
        className={cn(
          'shrink-0 border-2 shadow-md',
          !themed && 'border-border/60 bg-card/95',
        )}
        style={
          themed
            ? {
                borderColor: 'color-mix(in srgb, var(--theme-primary) 25%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--theme-card) 94%, white)',
              }
            : undefined
        }
      >
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <Book className="h-4 w-4" />
            My library books
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-xs text-muted-foreground">You have no books checked out right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn('shrink-0 border-2 shadow-md', !themed && 'border-primary/30 bg-card/95')}
      style={
        themed
          ? {
              borderColor: 'color-mix(in srgb, var(--theme-primary) 35%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--theme-card) 94%, white)',
            }
          : undefined
      }
    >
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
          <Book className="h-4 w-4 text-primary" />
          My library books
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-2 max-h-48 overflow-y-auto">
        {items.map((item) => {
          const overdueDays = computeDaysOverdue(item.dueAt);
          const isOverdue = overdueDays > 0;
          return (
            <Link
              key={item.id}
              href={`/${schoolId}/library/book?code=${encodeURIComponent(item.upc)}`}
              className={cn(
                'block rounded-xl border px-3 py-2 transition-colors hover:bg-muted/50',
                isOverdue ? 'border-amber-400/60 bg-amber-50/80 dark:bg-amber-950/30' : 'border-border/60 bg-muted/20',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  {item.author ? (
                    <p className="text-[10px] text-muted-foreground truncate">{item.author}</p>
                  ) : null}
                </div>
                {isOverdue ? (
                  <Badge variant="destructive" className="shrink-0 text-[9px] gap-0.5">
                    <AlertTriangle className="h-3 w-3" />
                    {overdueDays}d late
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-[9px]">
                    Out
                  </Badge>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <Calendar className="h-3 w-3 shrink-0" />
                Due {formatDueDate(item.dueAt)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tap to open · scan card to return</p>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
