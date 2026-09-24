'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { Clock, Radio } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { AttendanceScheduleSlot } from '@/lib/types';
import { getAttendanceConfig } from '@/lib/db/attendance';
import { getSchoolDayClock } from '@/lib/attendance/schoolDayClock';
import { cn } from '@/lib/utils';

function toMinutes(hhmm: string): number | null {
  const m = (hhmm || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** "8:05 AM" from minutes since midnight. */
export function formatMinutesAsClock(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function formatLeft(mins: number): string {
  if (mins <= 0) return 'ending now';
  if (mins < 60) return `${mins} min left`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min left` : `${h} hr left`;
}

export interface PeriodNow {
  current?: { slot: AttendanceScheduleSlot; start: number; end: number };
  next?: { slot: AttendanceScheduleSlot; start: number; end: number };
}

/** Which class period is on at `nowMin` (minutes since midnight), and which is next. */
export function periodAt(periods: AttendanceScheduleSlot[], nowMin: number): PeriodNow {
  const sorted = periods
    .map((slot) => ({ slot, start: toMinutes(slot.startTime), end: toMinutes(slot.endTime) }))
    .filter((x): x is { slot: AttendanceScheduleSlot; start: number; end: number } => x.start != null && x.end != null)
    .sort((a, b) => a.start - b.start);
  return {
    current: sorted.find((x) => nowMin >= x.start && nowMin < x.end),
    next: sorted.find((x) => x.start > nowMin),
  };
}

/** Ticks every second so the clock on the wall and this one agree. */
function useSecondClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/**
 * Live clock plus the current and next class period, shown at the top of attendance screens.
 * Uses the school's time zone when one is set. Loads the bell schedule and time zone itself
 * unless the page already has them.
 */
export function AttendanceClockBar({
  schoolId,
  periods: periodsProp,
  timeZone: timeZoneProp,
  className,
}: {
  schoolId: string;
  periods?: AttendanceScheduleSlot[] | null;
  timeZone?: string | null;
  className?: string;
}) {
  const firestore = useFirestore();
  const needPeriods = !periodsProp;
  const periodsRef = useMemoFirebase(
    () => (schoolId && needPeriods ? collection(firestore, 'schools', schoolId, 'periods') : null),
    [firestore, schoolId, needPeriods],
  );
  const { data: loadedPeriods } = useCollection<AttendanceScheduleSlot>(periodsRef);
  const periods = useMemo(() => periodsProp ?? loadedPeriods ?? [], [periodsProp, loadedPeriods]);

  const [loadedTz, setLoadedTz] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (timeZoneProp !== undefined || !schoolId || !firestore) return;
    let cancelled = false;
    getAttendanceConfig(firestore, schoolId)
      .then((c) => {
        if (!cancelled) setLoadedTz(c?.attendanceTimeZone);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [timeZoneProp, firestore, schoolId]);
  const timeZone = (timeZoneProp ?? loadedTz) || undefined;

  const nowMs = useSecondClock();
  const clock = getSchoolDayClock(nowMs, timeZone, { whenUnset: 'local' });
  const nowMin = clock.minutesSinceMidnight;
  const { current, next } = periodAt(periods, nowMin);

  let timeText = '';
  let dateText = '';
  try {
    const tzOpt = timeZone ? { timeZone } : {};
    timeText = new Date(nowMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', ...tzOpt });
    dateText = new Date(nowMs).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', ...tzOpt });
  } catch {
    timeText = new Date(nowMs).toLocaleTimeString();
    dateText = new Date(nowMs).toLocaleDateString();
  }

  const progress = current ? Math.min(100, Math.max(0, ((nowMin - current.start) / Math.max(1, current.end - current.start)) * 100)) : 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border bg-gradient-to-r from-primary/[0.07] via-background to-emerald-500/[0.06] p-4 sm:flex-row sm:items-center sm:gap-6',
        className,
      )}
      role="status"
      aria-live="off"
    >
      <div className="flex items-center gap-3 sm:min-w-[210px]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Clock className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-black tabular-nums leading-none">{timeText}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{dateText}</p>
        </div>
      </div>

      <div className="hidden h-10 w-px bg-border sm:block" aria-hidden="true" />

      <div className="min-w-0 flex-1 space-y-1.5">
        {current ? (
          <>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <Radio className="h-3 w-3" aria-hidden="true" /> Now
              </span>
              <span className="truncate text-base font-black">{current.slot.label}</span>
              <span className="text-xs text-muted-foreground">
                {formatMinutesAsClock(current.start)} – {formatMinutesAsClock(current.end)} · {formatLeft(current.end - nowMin)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <p className="text-base font-black">
            {periods.length === 0 ? 'No bell schedule yet' : next ? 'Between class periods' : 'Class periods are over for today'}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {next
            ? `Next: ${next.slot.label} at ${formatMinutesAsClock(next.start)} (in ${next.start - nowMin} min)`
            : periods.length === 0
              ? 'Add class periods under Bell Schedule to see them here.'
              : 'No more class periods today.'}
        </p>
      </div>
    </div>
  );
}
