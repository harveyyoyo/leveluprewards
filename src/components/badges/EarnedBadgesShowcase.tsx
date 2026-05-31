'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Award } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DynamicIcon from '@/components/DynamicIcon';
import type { Badge, Student, StudentTheme } from '@/lib/types';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animation';

const PERIOD_LABELS: Record<string, string> = {
  month: 'Month',
  semester: 'Semester',
  year: 'Year',
  all: 'All time',
};

function formatPeriodKey(periodKey: string): string {
  if (periodKey === 'all') return 'All time';
  if (/^\d{4}-\d{2}$/.test(periodKey)) {
    const [y, m] = periodKey.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
    return format(date, 'MMM yyyy');
  }
  if (/^\d{4}-H[12]$/.test(periodKey)) {
    const [y, h] = periodKey.split('-');
    return h === 'H1' ? `Jan–Jun ${y}` : `Jul–Dec ${y}`;
  }
  if (/^\d{4}$/.test(periodKey)) return periodKey;
  return periodKey;
}

export interface EarnedBadgesShowcaseProps {
  student: Student;
  badges: Badge[];
  enableBadges: boolean;
  theme?: StudentTheme | null;
  className?: string;
}

export function EarnedBadgesShowcase({ student, badges, enableBadges, theme, className }: EarnedBadgesShowcaseProps) {
  const reduceMotion = useReducedMotion();
  const earned = useMemo(() => {
    if (!student.earnedBadges?.length || !badges?.length) return [];
    return student.earnedBadges
      .map((e) => {
        const def = badges.find((b) => b.id === e.badgeId);
        return def && def.enabled !== false ? { ...def, periodKey: e.periodKey, earnedAt: e.earnedAt } : null;
      })
      .filter(Boolean) as (Badge & { periodKey: string; earnedAt: number })[];
  }, [student.earnedBadges, badges]);

  if (!enableBadges || earned.length === 0) return null;

  return (
    <Card className={cn('border-none shadow-lg overflow-hidden', className)} style={theme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={theme ? { backgroundColor: theme.background || 'var(--theme-bg)' } : undefined}
          >
            <Award className="w-4 h-4" style={theme ? { color: theme.primary || 'var(--theme-primary)' } : undefined} />
          </div>
          <div>
            <CardTitle className="text-base font-black">Your badges</CardTitle>
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Earned for reaching category goals in a time period.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          variants={reduceMotion ? undefined : staggerContainer}
          initial={reduceMotion ? false : 'hidden'}
          animate={reduceMotion ? undefined : 'show'}
        >
          {earned.map((b) => (
            <motion.div
              key={`${b.id}-${b.periodKey}`}
              variants={reduceMotion ? undefined : staggerItem}
              className="p-4 rounded-xl border-2 flex flex-col items-center text-center gap-2 bg-primary/5 border-primary/30"
              style={b.accentColor ? { borderColor: b.accentColor, backgroundColor: `${b.accentColor}15` } : undefined}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center border-2 bg-primary/10 shrink-0"
                style={b.accentColor ? { borderColor: b.accentColor, color: b.accentColor } : undefined}
              >
                <DynamicIcon name={b.icon} className="w-6 h-6" style={b.accentColor ? { color: b.accentColor } : undefined} />
              </div>
              <p className="text-xs font-bold leading-tight line-clamp-2">{b.name}</p>
              <span className="text-[10px] text-muted-foreground">{formatPeriodKey(b.periodKey)}</span>
              {b.earnedAt && (
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Earned {format(b.earnedAt, 'MMM d')}
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}
