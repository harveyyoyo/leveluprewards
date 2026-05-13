'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Lock, Trophy } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DynamicIcon from '@/components/DynamicIcon';
import type { Achievement, Student, StudentTheme } from '@/lib/types';
import { staggerContainer, staggerItem } from '@/lib/animation';
import { cn } from '@/lib/utils';

const TIER_STYLES: Record<NonNullable<Achievement['tier']>, { border: string; bg: string; text: string }> = {
  bronze: { border: 'border-amber-700/50', bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
  silver: { border: 'border-slate-400/50', bg: 'bg-slate-400/10', text: 'text-slate-600 dark:text-slate-300' },
  gold: { border: 'border-amber-500/60', bg: 'bg-amber-400/15', text: 'text-amber-600 dark:text-amber-300' },
  platinum: { border: 'border-cyan-400/50', bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
};

export interface BadgeShowcaseProps {
  student: Student;
  achievements: Achievement[];
  enableAchievements: boolean;
  theme?: StudentTheme | null;
  className?: string;
}

export function BadgeShowcase({ student, achievements, enableAchievements, theme, className }: BadgeShowcaseProps) {
  const reduceMotion = useReducedMotion();
  const earnedSet = useMemo(
    () => new Set((student.earnedAchievements || []).map((e) => e.achievementId)),
    [student.earnedAchievements]
  );
  const earnedByAchievement = useMemo(() => {
    const map = new Map<string, number>();
    (student.earnedAchievements || []).forEach((e) => map.set(e.achievementId, e.earnedAt));
    return map;
  }, [student.earnedAchievements]);

  if (!enableAchievements || !achievements?.length) {
    return null;
  }

  return (
    <Card className={cn('border-none shadow-lg overflow-hidden', className)} style={theme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={theme ? { backgroundColor: theme.background || 'var(--theme-bg)' } : undefined}
          >
            <Trophy className="w-4 h-4" style={theme ? { color: theme.primary || 'var(--theme-primary)' } : undefined} />
          </div>
          <div>
            <CardTitle className="text-base font-black">Bonus point milestones</CardTitle>
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Earn extra points when you hit these point thresholds.
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
          {achievements.map((ach) => {
            const earned = earnedSet.has(ach.id);
            const earnedAt = earnedByAchievement.get(ach.id);
            const tierStyle = ach.tier ? TIER_STYLES[ach.tier] : null;
            const accent = ach.accentColor;
            const progress =
              ach.criteria.type === 'points'
                ? { current: student.points || 0, threshold: ach.criteria.threshold }
                : ach.criteria.type === 'lifetimePoints'
                  ? { current: student.lifetimePoints || 0, threshold: ach.criteria.threshold }
                  : null;

            return (
              <motion.div
                key={ach.id}
                variants={reduceMotion ? undefined : staggerItem}
                className={cn(
                  'relative p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-2 min-h-[120px]',
                  earned
                    ? tierStyle
                      ? `${tierStyle.border} ${tierStyle.bg}`
                      : 'border-primary/30 bg-primary/5'
                    : 'border-border/50 bg-muted/20 opacity-75',
                  !earned && 'grayscale-[0.7]'
                )}
                style={
                  accent && earned
                    ? { borderColor: accent, backgroundColor: `${accent}15` }
                    : theme && earned
                      ? { borderColor: theme.primary ? `var(--theme-primary)` : undefined, backgroundColor: theme.primary ? `${theme.primary}15` : undefined }
                      : undefined
                }
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center border-2 shrink-0',
                    earned ? (tierStyle ? tierStyle.bg : 'bg-primary/10') : 'bg-muted'
                  )}
                  style={accent && earned ? { borderColor: accent, color: accent } : theme && earned ? { borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' } : undefined}
                >
                  {earned ? (
                    <DynamicIcon name={ach.icon} className="w-6 h-6" style={accent ? { color: accent } : undefined} />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs font-bold leading-tight line-clamp-2">{ach.name}</p>
                {earned && earnedAt && (
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Earned {format(earnedAt, 'MMM d')}
                  </span>
                )}
                {!earned && progress && progress.threshold > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {progress.current}/{progress.threshold} pts
                  </span>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </CardContent>
    </Card>
  );
}
