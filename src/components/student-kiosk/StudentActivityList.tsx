'use client';

import { format } from 'date-fns';
import { CheckCircle2, Clock, Gift, Printer, Ticket } from 'lucide-react';
import { collection, limit, orderBy, query } from 'firebase/firestore';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { HistoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StudentActivityList({
  schoolId,
  studentId,
  themed = false,
  onReprintTicket,
  maxItems,
  preview = false,
}: {
  schoolId: string;
  studentId: string;
  themed?: boolean;
  onReprintTicket?: (item: HistoryItem) => void;
  maxItems?: number;
  /** Compact preview — no reprint actions, smaller empty state. */
  preview?: boolean;
}) {
  const firestore = useFirestore();
  const activitiesQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, `schools/${schoolId}/students/${studentId}/activities`),
        orderBy('date', 'desc'),
        limit(20),
      ),
    [firestore, schoolId, studentId],
  );
  const { data: history, isLoading } = useCollection<HistoryItem>(activitiesQuery);
  const themedTextStyle: React.CSSProperties | undefined = themed ? { color: 'var(--theme-text)' } : undefined;
  const themedMutedStyle: React.CSSProperties | undefined = themed ? { color: 'var(--theme-text)', opacity: 0.7 } : undefined;

  if (isLoading) {
    const rows = preview ? 3 : 5;
    return (
      <div className="space-y-2 p-3" role="status" aria-live="polite" aria-label="Loading activity">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-border/50">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-14" />
            </div>
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        ))}
        <span className="sr-only">Loading activity…</span>
      </div>
    );
  }

  const visibleHistory =
    typeof maxItems === 'number' ? (history || []).slice(0, Math.max(0, maxItems)) : history || [];

  return (
    <div className="w-full overflow-hidden">
      <ul className="space-y-2">
        {history && history.length > 0 ? (
          visibleHistory.map((item, index) => {
            const desc = item.desc ?? '';
            const isRedemption = desc.startsWith('Redeemed:');
            const amount = Number(item.amount ?? 0);
            const isPointGain = amount > 0;

            return (
              <li
                key={index}
                className={cn(
                  'group rounded-xl p-2 transition-all duration-300',
                  !themed && 'border border-slate-50 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50',
                  !themed && !preview && 'hover:bg-slate-50 dark:hover:bg-slate-800/80',
                )}
                style={
                  themed
                    ? {
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderColor: 'rgba(127,127,127,0.25)',
                        borderWidth: 1,
                        borderStyle: 'solid',
                      }
                    : undefined
                }
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex gap-2 min-w-0">
                    <div
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                        isRedemption
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                          : desc.toLowerCase().includes('attendance') ||
                              desc.toLowerCase().includes('sign-in')
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                      )}
                    >
                      {isRedemption ? (
                        <Gift className="h-3.5 w-3.5" aria-hidden />
                      ) : desc.toLowerCase().includes('attendance') ||
                        desc.toLowerCase().includes('sign-in') ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Ticket className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'truncate text-[13px] font-bold leading-tight',
                          !themed && 'text-slate-800 dark:text-slate-200',
                        )}
                        style={themedTextStyle}
                      >
                        {desc}
                      </p>
                      <div
                        className={cn('mt-0.5 flex items-center gap-1', !themed && 'text-muted-foreground')}
                        style={themedMutedStyle}
                      >
                        <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden />
                        <span className="text-[10px] font-semibold tracking-wide">
                          {item.date ? format(new Date(item.date), 'MMM d, h:mm a') : 'Recently'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={isPointGain ? 'default' : 'secondary'}
                    className={cn(
                      'shrink-0 rounded-full px-1.5 py-0 text-[9px] font-black tracking-tighter',
                      !themed &&
                        (isPointGain
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'),
                    )}
                    style={
                      themed
                        ? {
                            backgroundColor: isPointGain ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)',
                            color: 'var(--theme-text)',
                            borderColor: 'transparent',
                          }
                        : undefined
                    }
                  >
                    {isPointGain ? `+${amount}` : amount} PTS
                  </Badge>
                </div>
                {!preview && isRedemption ? (
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                        !themed &&
                          (item.fulfilled
                            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'),
                      )}
                      style={
                        themed
                          ? {
                              backgroundColor: item.fulfilled ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.18)',
                              color: 'var(--theme-text)',
                              borderColor: 'transparent',
                            }
                          : undefined
                      }
                    >
                      {item.fulfilled ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" aria-hidden /> Delivered
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" aria-hidden /> Pending
                        </>
                      )}
                    </div>
                    {onReprintTicket ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReprintTicket(item);
                        }}
                        className={cn(
                          'flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[10px] bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700',
                          !themed && 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300',
                        )}
                        style={
                          themed
                            ? {
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                borderColor: 'rgba(127,127,127,0.3)',
                                color: 'var(--theme-text)',
                              }
                            : undefined
                        }
                      >
                        <Printer className="h-3 w-3" aria-hidden /> Reprint
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center text-center',
              preview ? 'py-4 space-y-1' : 'space-y-3 py-12',
            )}
          >
            {!preview ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
                <Clock className="h-6 w-6 text-slate-300" aria-hidden />
              </div>
            ) : null}
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No activity yet</p>
          </div>
        )}
      </ul>
    </div>
  );
}
