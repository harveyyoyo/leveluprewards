'use client';

import { AlertTriangle } from 'lucide-react';
import { Helper } from '@/components/ui/helper';
import type { HouseStandingsRow } from '@/lib/houses/houseStandings';
import { cn } from '@/lib/utils';

export function HouseStandingsInlineCell({ row }: { row: HouseStandingsRow }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${row.barPercent}%`, backgroundColor: row.house.color }}
        />
      </div>
      <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
        <span className="font-bold tabular-nums">{row.points.toLocaleString()}</span>
        <span
          className={cn(
            'tabular-nums inline-flex items-center gap-0.5 shrink-0',
            row.imbalanced && 'text-amber-600 dark:text-amber-400 font-bold',
          )}
        >
          {row.members}m · {row.perCapita} avg
          {row.imbalanced ? (
            <Helper
              content={`${row.members} members vs ~${row.avgMembersPerHouse} average per house — uneven roster, not an error.`}
            >
              <AlertTriangle className="h-3 w-3 shrink-0" aria-label="Uneven roster" />
            </Helper>
          ) : null}
        </span>
      </div>
    </div>
  );
}
