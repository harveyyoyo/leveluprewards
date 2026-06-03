'use client';

import { Home, Trophy, UserMinus, Users } from 'lucide-react';
import { HouseBadge } from '@/components/houses/HouseBadge';
import type { House } from '@/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  houseCount: number;
  assignedCount: number;
  unassignedCount: number;
  leader: House | null;
  className?: string;
};

export function AdminHousesStatsStrip({
  houseCount,
  assignedCount,
  unassignedCount,
  leader,
  className,
}: Props) {
  const stats = [
    {
      label: 'Houses',
      value: houseCount.toLocaleString(),
      icon: Home,
      tone: 'text-primary',
    },
    {
      label: 'In a house',
      value: assignedCount.toLocaleString(),
      icon: Users,
      tone: 'text-foreground',
    },
    {
      label: 'Unassigned',
      value: unassignedCount.toLocaleString(),
      icon: UserMinus,
      tone: unassignedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
    },
  ];

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="rounded-2xl border bg-card/80 px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Icon className={cn('h-3.5 w-3.5', stat.tone)} aria-hidden />
              {stat.label}
            </div>
            <p className={cn('mt-1 text-2xl font-black tabular-nums', stat.tone)}>{stat.value}</p>
          </div>
        );
      })}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card/80 to-card/80 px-4 py-3 shadow-sm sm:col-span-2 lg:col-span-1">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Trophy className="h-3.5 w-3.5 text-primary" aria-hidden />
          Leading house
        </div>
        {leader ? (
          <div className="mt-2 flex items-center gap-2 min-w-0">
            <HouseBadge house={leader} size="sm" className="shrink-0 max-w-[10rem]" />
            <span className="text-sm font-bold tabular-nums text-foreground shrink-0">
              {(leader.points ?? 0).toLocaleString()} pts
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">—</p>
        )}
      </div>
    </div>
  );
}
