'use client';

import { ListOrdered } from 'lucide-react';
import type { ClassroomSessionActivityEntry } from '@/lib/classroomSeatingChart';
import { formatBehaviorNoteTime } from '@/lib/classroom/behaviorNoteTime';
import { cn } from '@/lib/utils';

export function ClassroomSessionActivityList({
  entries,
  compact = false,
  borderless = false,
  hideTitle = false,
  className,
}: {
  entries: ClassroomSessionActivityEntry[];
  /** Toolbar strip vs fullscreen sidebar. */
  compact?: boolean;
  /** Render without an inner bordered panel (sits outside toolbar chrome). */
  borderless?: boolean;
  /** Parent supplies the section chrome (e.g. collapsible monitor sidebar). */
  hideTitle?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-col',
        compact ? 'max-h-28 min-w-[9rem] max-w-[11rem] sm:max-w-[13rem]' : 'h-full max-h-full',
        className,
      )}
    >
      {hideTitle ? null : (
        <div className="mb-1.5 flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
          <ListOrdered className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Activity
        </div>
      )}
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          borderless ? 'bg-transparent' : 'rounded-lg border border-border/60 bg-muted/20',
          compact ? 'max-h-24 p-1.5' : 'p-2',
        )}
      >
        {entries.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">Awards this session appear here.</p>
        ) : (
          <ul className={cn('space-y-1.5', compact && 'space-y-1')}>
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  borderless
                    ? 'border-b border-border/30 pb-1.5 last:border-b-0 last:pb-0'
                    : 'rounded-md border border-border/40 bg-background/80 px-2 py-1.5',
                  !borderless && compact && 'px-1.5 py-1',
                  borderless && 'px-0.5',
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      'truncate font-bold tabular-nums',
                      entry.points > 0
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : entry.points < 0
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-foreground',
                      compact ? 'text-[11px]' : 'text-xs',
                    )}
                  >
                    {entry.points > 0 ? '+' : ''}
                    {entry.points}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {formatBehaviorNoteTime(entry.at)}
                  </span>
                </div>
                <p className={cn('truncate font-semibold text-foreground', compact ? 'text-[10px]' : 'text-[11px]')}>
                  {entry.studentLabel || 'Student'}
                </p>
                <p className={cn('truncate text-muted-foreground', compact ? 'text-[9px]' : 'text-[10px]')}>
                  {entry.label}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
