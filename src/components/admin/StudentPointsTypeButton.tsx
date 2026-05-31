'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getStudentPointTypeTotals } from '@/lib/students/studentPointTypes';
import type { Student } from '@/lib/types';

function formatCirclePoints(points: number): string {
  const n = Math.max(0, Math.round(points));
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
  if (n >= 10_000) return `${Math.round(n / 100) / 10}k`;
  return n.toLocaleString();
}

type StudentPointsTypeButtonProps = {
  student: Pick<Student, 'points' | 'lifetimePoints' | 'categoryPoints'>;
  className?: string;
};

export function StudentPointsTypeButton({ student, className }: StudentPointsTypeButtonProps) {
  const totals = useMemo(() => getStudentPointTypeTotals(student), [student]);
  const points = Math.max(0, Math.round(student.points ?? 0));
  const circleLabel = formatCirclePoints(points);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            'h-8 w-8 min-h-0 min-w-0 rounded-full sm:justify-self-center shrink-0',
            'border-ring/35 bg-background/80 font-black tabular-nums text-[9px] sm:text-[10px] leading-none',
            totals.length > 0
              ? 'text-primary border-primary/40 hover:bg-primary/10'
              : 'text-muted-foreground',
            className,
          )}
          title={`${points.toLocaleString()} points — click for breakdown`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="max-w-[2.25rem] truncate px-0.5">{circleLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Point balance
        </p>
        <p className="mt-0.5 text-lg font-black tabular-nums text-primary">
          {points.toLocaleString()}{' '}
          <span className="text-xs font-bold uppercase tracking-wide opacity-70">pts</span>
        </p>
        {totals.length > 0 ? (
          <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
            {totals.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="min-w-0 truncate font-medium text-foreground">{row.label}</span>
                <span className="shrink-0 font-bold tabular-nums text-muted-foreground">
                  {row.points.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No point types yet.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
