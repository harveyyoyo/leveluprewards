'use client';

import { useMemo } from 'react';
import { Crown, Sparkles, Trophy, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { HouseBadge } from '@/components/houses/HouseBadge';
import type { House, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animation';

type HouseHallOfFameCardProps = {
  houses: House[];
  currentHouseId?: string;
  students?: Pick<Student, 'houseId'>[];
  compact?: boolean;
  className?: string;
};

function formatPoints(points: number): string {
  return `${points.toLocaleString()} pts`;
}

export function HouseHallOfFameCard({
  houses,
  currentHouseId,
  students,
  compact = false,
  className,
}: HouseHallOfFameCardProps) {
  const rankedHouses = useMemo(() => {
    const memberCounts = new Map<string, number>();
    for (const student of students ?? []) {
      if (!student.houseId) continue;
      memberCounts.set(student.houseId, (memberCounts.get(student.houseId) ?? 0) + 1);
    }

    return [...houses]
      .sort(
        (a, b) =>
          (b.points ?? 0) - (a.points ?? 0) ||
          (b.lifetimePoints ?? 0) - (a.lifetimePoints ?? 0) ||
          a.name.localeCompare(b.name),
      )
      .map((house, index) => {
        const members = memberCounts.get(house.id);
        return {
          ...house,
          rank: index + 1,
          members,
          perMemberPoints: members && members > 0 ? Math.round((house.points ?? 0) / members) : null,
        };
      });
  }, [houses, students]);

  if (rankedHouses.length < 2) return null;

  const champion = rankedHouses[0];
  const currentHouse = currentHouseId ? rankedHouses.find((house) => house.id === currentHouseId) : undefined;
  const podium = rankedHouses.slice(0, 3);
  const maxPoints = Math.max(champion.points ?? 0, 1);

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn(
        'overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-muted/20 p-4 shadow-sm',
        className,
      )}
      aria-label="House Hall of Fame"
    >
      <motion.div variants={staggerItem} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Trophy className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                House Hall of Fame
              </p>
              <h3 className="font-headline text-xl font-black tracking-tight">
                {champion.name} leads the houses
              </h3>
            </div>
          </div>
          {currentHouse ? (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              Your house is #{currentHouse.rank} with {formatPoints(currentHouse.points ?? 0)}.
            </p>
          ) : (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              Celebrate team totals, school spirit, and every point earned together.
            </p>
          )}
        </div>
        <HouseBadge house={champion} size="lg" className="shrink-0" />
      </motion.div>

      <motion.div
        variants={staggerContainer}
        className={cn('mt-4 grid gap-3', compact ? 'sm:grid-cols-3' : 'md:grid-cols-3')}
      >
        {podium.map((house, index) => {
          const isChampion = index === 0;
          return (
            <motion.div
              key={house.id}
              variants={staggerItem}
              className={cn(
                'relative rounded-2xl border bg-card/80 p-3 shadow-sm',
                currentHouseId === house.id && 'ring-2 ring-primary/30',
                isChampion && 'border-primary/30 bg-primary/[0.04]',
              )}
              style={{ borderColor: isChampion ? `${house.color}66` : undefined }}
            >
              <div
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black"
                style={{
                  borderColor: `${house.color}55`,
                  backgroundColor: `${house.color}18`,
                  color: house.color,
                }}
                aria-label={`Rank ${house.rank}`}
              >
                {isChampion ? <Crown className="h-3.5 w-3.5" aria-hidden /> : house.rank}
              </div>
              <div className="pr-8">
                <HouseBadge house={house} size="sm" />
                <p className="mt-3 text-2xl font-black tabular-nums tracking-tight text-foreground">
                  {formatPoints(house.points ?? 0)}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {house.lifetimePoints ? `${house.lifetimePoints.toLocaleString()} lifetime` : house.value || 'Team total'}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.ul variants={staggerContainer} className="mt-4 space-y-2">
        {rankedHouses.map((house) => {
          const points = house.points ?? 0;
          const percent = Math.round((points / maxPoints) * 100);
          const isCurrent = currentHouseId === house.id;

          return (
            <motion.li
              key={house.id}
              variants={staggerItem}
              className={cn(
                'rounded-xl border bg-background/70 px-3 py-2',
                isCurrent && 'border-primary/35 bg-primary/5',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-xs font-black tabular-nums text-muted-foreground">
                    {house.rank}
                  </span>
                  <span className="truncate text-base font-bold text-foreground">{house.name}</span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black tabular-nums text-foreground">{formatPoints(points)}</p>
                  {typeof house.members === 'number' ? (
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      <Users className="mr-1 inline h-3 w-3" aria-hidden />
                      {house.members}
                      {house.perMemberPoints !== null ? ` · ${house.perMemberPoints} avg` : ''}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/50">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  style={{ backgroundColor: house.color }}
                />
              </div>
            </motion.li>
          );
        })}
      </motion.ul>

      {!compact ? (
        <motion.p variants={staggerItem} className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          Keep awarding points and this board updates with the latest house standings.
        </motion.p>
      ) : null}
    </motion.section>
  );
}
