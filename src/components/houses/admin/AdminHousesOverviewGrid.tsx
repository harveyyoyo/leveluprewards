'use client';

import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HouseBadge } from '@/components/houses/HouseBadge';
import { HouseStandingsInlineCell } from '@/components/houses/HouseStandingsInlineCell';
import type { HouseStandingsRow } from '@/lib/houses/houseStandings';
import { cn } from '@/lib/utils';

type Props = {
  rows: HouseStandingsRow[];
  onManageHouse: (houseId: string) => void;
  className?: string;
};

export function AdminHousesOverviewGrid({ rows, onManageHouse, className }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {rows.map((row) => {
        const isLeader = row.rank === 1;
        return (
          <article
            key={row.id}
            className={cn(
              'flex flex-col gap-3 rounded-2xl border bg-card/90 p-4 shadow-sm transition-colors hover:border-primary/35',
              isLeader && 'border-primary/30 ring-1 ring-primary/15',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums',
                  isLeader ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {row.rank}
              </span>
              <div className="min-w-0 flex-1">
                <HouseBadge house={row.house} size="md" className="max-w-full" />
                {row.house.motto ? (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{row.house.motto}</p>
                ) : null}
              </div>
            </div>
            <HouseStandingsInlineCell row={row} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-between rounded-xl text-xs font-semibold"
              onClick={() => onManageHouse(row.id)}
            >
              Manage roster
              <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
            </Button>
          </article>
        );
      })}
    </div>
  );
}
