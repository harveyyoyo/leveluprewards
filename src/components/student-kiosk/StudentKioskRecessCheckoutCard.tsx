'use client';

import { DoorOpen, Timer, ScanBarcode } from 'lucide-react';
import type { Student } from '@/lib/types';
import { useStudentRecessPass } from '@/hooks/useStudentRecessPass';
import { RECESS_REASON_BY_VALUE, recessReasonBadgeClasses } from '@/lib/recess/recessReasons';
import { formatBathroomElapsed, isBathroomOverLimit } from '@/lib/bathroom/formatBathroomElapsed';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Shown on the signed-in student kiosk only while the student is checked out
 * (after scanning a physical recess pass). Hidden until then — return is scan-only.
 */
export function StudentKioskRecessCheckoutCard({
  schoolId,
  student,
  themed,
  maxMinutes,
}: {
  schoolId: string;
  student: Student;
  themed?: boolean;
  primaryForeground?: string;
  maxMinutes: number;
  onActivity?: () => void;
}) {
  const activePass = useStudentRecessPass(schoolId, student.id, true);
  const isOut = !!activePass?.startedAt;

  if (!isOut) return null;

  const now = Date.now();
  const elapsed = now - (activePass!.startedAt || now);
  const over = isBathroomOverLimit(elapsed, maxMinutes);
  const activeMeta = activePass?.reason ? RECESS_REASON_BY_VALUE.get(activePass.reason) : null;
  const ActiveIcon = activeMeta?.icon ?? DoorOpen;

  return (
    <Card
      className={cn(
        'shrink-0 border-2 shadow-md',
        over ? 'border-red-500/60 bg-red-500/10' : 'border-violet-500/40 bg-violet-500/5',
      )}
      style={
        themed && over
          ? {
              borderColor: 'color-mix(in srgb, #ef4444 55%, var(--theme-primary))',
              backgroundColor: 'color-mix(in srgb, #ef4444 12%, var(--theme-card))',
            }
          : themed
            ? {
                borderColor: 'color-mix(in srgb, var(--theme-primary) 45%, #8b5cf6)',
                backgroundColor: 'color-mix(in srgb, var(--theme-card) 92%, white)',
              }
            : undefined
      }
      data-intro-tour="kiosk-recess-checkout"
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
          <Timer className="h-4 w-4 shrink-0" aria-hidden />
          You are out of the room
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
          <span
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2',
              activePass?.reason ? recessReasonBadgeClasses(activePass.reason) : '',
            )}
          >
            <ActiveIcon className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold">{activeMeta?.label ?? 'Out'}</p>
            <p className="text-xs text-muted-foreground">
              {over
                ? 'Please return — scan your recess pass at the scanner'
                : 'Scan the same recess pass again when you are back'}
            </p>
          </div>
          <span
            className={cn(
              'font-mono text-xl font-black tabular-nums',
              over ? 'text-red-600 dark:text-red-300' : 'text-foreground',
            )}
          >
            {formatBathroomElapsed(elapsed)}
          </span>
        </div>
        <div
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2 text-center text-xs font-semibold',
            over
              ? 'border-red-400/60 bg-red-500/5 text-red-700 dark:text-red-200'
              : 'border-violet-400/50 bg-violet-500/5 text-violet-900 dark:text-violet-100',
          )}
        >
          <ScanBarcode className="h-4 w-4 shrink-0" aria-hidden />
          Scan your recess pass at the coupon scanner to check back in
        </div>
      </CardContent>
    </Card>
  );
}
