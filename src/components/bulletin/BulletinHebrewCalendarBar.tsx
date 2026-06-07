'use client';

import { useMemo } from 'react';
import { CalendarDays, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  formatCivilDateLabel,
  formatTodayHebrewDate,
  getUpcomingJewishHolidays,
} from '@/lib/hebrewCalendar';
import { springCinematic } from '@/lib/animation';

type BulletinHebrewCalendarBarProps = {
  showHebrewDate?: boolean;
  showJewishHolidays?: boolean;
  className?: string;
};

export function BulletinHebrewCalendarBar({
  showHebrewDate = false,
  showJewishHolidays = false,
  className,
}: BulletinHebrewCalendarBarProps) {
  const today = useMemo(() => new Date(), []);
  const hebrewDate = useMemo(() => formatTodayHebrewDate(today), [today]);
  const civilDate = useMemo(() => formatCivilDateLabel(today), [today]);
  const holidays = useMemo(
    () => (showJewishHolidays ? getUpcomingJewishHolidays({ from: today, limit: 4 }) : []),
    [showJewishHolidays, today],
  );

  if (!showHebrewDate && !showJewishHolidays) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springCinematic}
      className={cn(
        'w-full rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-background/80 to-indigo-500/10 backdrop-blur-md px-4 py-4 md:px-6',
        className,
      )}
    >
      {showHebrewDate ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-xl bg-amber-500/15 p-2 text-amber-700 dark:text-amber-200 shrink-0">
              <CalendarDays className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">
                Hebrew date
              </p>
              <p className="text-lg md:text-xl font-black tracking-tight text-foreground" dir="rtl" lang="he">
                {hebrewDate}
              </p>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">{civilDate}</p>
            </div>
          </div>
        </div>
      ) : null}

      {showJewishHolidays && holidays.length > 0 ? (
        <div className={cn(showHebrewDate && 'mt-4 border-t border-amber-500/20 pt-4')}>
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-600 dark:text-amber-300" aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">
              Upcoming holidays
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="rounded-xl border border-white/20 bg-white/35 dark:bg-black/20 px-3 py-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight">{holiday.nameEn}</p>
                    <p className="text-xs text-muted-foreground mt-0.5" dir="rtl" lang="he">
                      {holiday.nameHe}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {holiday.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground" dir="rtl" lang="he">
                      {holiday.hebrewDate}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
