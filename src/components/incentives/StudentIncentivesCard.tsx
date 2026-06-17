'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, Tag } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { BulletinBoardIncentiveRecord } from '@/lib/bulletinBoard';
import {
  incentivesForSurface,
  incentivesVisibleOnSurface,
  type IncentiveSurfaceKey,
} from '@/lib/incentives/incentiveSurfaces';
import { cn } from '@/lib/utils';

type StudentIncentivesCardProps = {
  schoolId: string;
  surface: Extract<IncentiveSurfaceKey, 'studentKiosk' | 'studentPortal'>;
  themed?: boolean;
  themeForeground?: string;
  className?: string;
  maxItems?: number;
};

export function StudentIncentivesCard({
  schoolId,
  surface,
  themed = false,
  themeForeground,
  className,
  maxItems = 6,
}: StudentIncentivesCardProps) {
  const firestore = useFirestore();
  const { settings } = useSettings();
  const enabled = incentivesVisibleOnSurface(settings, surface);

  const incentivesQuery = useMemoFirebase(
    () =>
      enabled && schoolId
        ? query(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives'))
        : null,
    [enabled, firestore, schoolId],
  );
  const { data: incentives, isLoading } = useCollection<BulletinBoardIncentiveRecord>(incentivesQuery);

  const activeIncentives = useMemo(() => incentivesForSurface(incentives, surface), [incentives, surface]);
  const visibleIncentives = useMemo(
    () => activeIncentives.slice(0, maxItems),
    [activeIncentives, maxItems],
  );

  if (!enabled) return null;
  if (!isLoading && visibleIncentives.length === 0) return null;

  const titleStyle = themed ? { color: themeForeground || 'var(--theme-text)' } : undefined;
  const textStyle = themed ? { color: 'var(--theme-page-text)' } : undefined;
  const cardStyle = themed
    ? {
        borderColor: 'color-mix(in srgb, var(--theme-primary) 28%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--theme-card) 92%, white)',
      }
    : undefined;

  return (
    <Card className={cn('border-2', className)} style={cardStyle}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg" style={titleStyle}>
          <Tag className="h-4 w-4 text-primary" aria-hidden />
          Ways to earn points
        </CardTitle>
        <CardDescription style={textStyle}>
          School-wide opportunities — complete the task, then ask your teacher to award points.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <motion.ul
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {visibleIncentives.map((item) => (
              <motion.li
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { type: 'spring', stiffness: 420, damping: 30 },
                  },
                }}
                className={cn(
                  'flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5',
                  !themed && 'border-border/60 bg-muted/20',
                )}
                style={
                  themed
                    ? {
                        borderColor: 'color-mix(in srgb, var(--theme-primary) 18%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--theme-bg) 55%, transparent)',
                      }
                    : undefined
                }
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="select-none text-lg leading-none" role="img" aria-hidden>
                    {item.icon || '🎯'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold" style={titleStyle}>
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs opacity-80" style={textStyle}>
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                  +{Number(item.points ?? 0)}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        )}
        {activeIncentives.length > maxItems ? (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold opacity-70" style={textStyle}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {activeIncentives.length - maxItems} more on hallway displays
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
