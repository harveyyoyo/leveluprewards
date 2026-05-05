'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ToggleDef {
  key: string;
  label: string;
  shortLabel: string;
  /** When true, missing/undefined on the record counts as enabled (matches `field !== false` defaults). */
  missingMeansOn?: boolean;
}

export function AutoCircularToggles<T extends Record<string, any>>({
  record,
  defs = [],
  onToggle,
  /** When true, only `defs` are shown (no auto-discovery of other boolean fields on `record`). */
  restrictToDefs = false,
}: {
  record: T;
  defs?: ToggleDef[];
  onToggle: (key: string, newValue: boolean) => void;
  restrictToDefs?: boolean;
}) {
  // Combine explicitly given defs with any found boolean fields in the record instance
  const allDefs = [...defs];
  if (!restrictToDefs) {
    Object.keys(record).forEach((k) => {
      // Avoid built-in or private fields that shouldn't be toggled
      if (
        typeof record[k] === 'boolean' &&
        !defs.some((d) => d.key === k) &&
        !['used', 'active'].includes(k)
      ) {
        allDefs.push({
          key: k,
          label: `Toggle ${k}`,
          shortLabel: k.substring(0, 3).toUpperCase(),
        });
      }
    });
  }

  if (allDefs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 items-center shrink-0">
      {allDefs.map(({ key, label, shortLabel, missingMeansOn }) => {
        const raw = record[key];
        const val = missingMeansOn ? raw !== false : !!raw;
        const isPill = shortLabel.trim().length > 3;
        const inStockCount =
          key === 'inStock' && typeof (record as any)?.stockCount === 'number'
            ? ((record as any).stockCount as number)
            : undefined;
        const title = inStockCount !== undefined ? `${label} (${inStockCount} left)` : label;
        return (
          <Button
            key={key}
            type="button"
            variant="outline"
            size={isPill ? "sm" : "icon"}
            className={cn(
              isPill
                ? "h-7 rounded-full px-2.5 text-[10px] font-black uppercase tracking-tight"
                : "h-8 w-8 sm:h-9 sm:w-9 rounded-full",
              "transition-all border shrink-0 text-center flex items-center justify-center select-none shadow-sm",
              val
                ? "bg-primary/20 hover:bg-primary/30 border-primary/50 text-primary font-bold"
                : "bg-muted/40 hover:bg-muted/60 border-border text-muted-foreground/60 font-medium"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(key, !val);
            }}
            title={title}
          >
            {isPill ? (
              <span className="inline-flex items-center gap-1 leading-none">
                <span className="truncate">{shortLabel}</span>
                {inStockCount !== undefined ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none",
                      val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border",
                    )}
                    aria-label={`${inStockCount} left`}
                  >
                    {inStockCount}
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="flex flex-col items-center justify-center leading-none">
                <span className="text-[9px] sm:text-[10px] tracking-tight uppercase font-bold">
                  {shortLabel}
                </span>
                {inStockCount !== undefined ? (
                  <span
                    className={cn(
                      "mt-0.5 rounded-full px-1 py-px text-[8px] font-black leading-none",
                      val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border",
                    )}
                    aria-label={`${inStockCount} left`}
                  >
                    {inStockCount}
                  </span>
                ) : null}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
