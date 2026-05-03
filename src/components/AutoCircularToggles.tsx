'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ToggleDef {
  key: string;
  label: string;
  shortLabel: string;
}

export function AutoCircularToggles<T extends Record<string, any>>({
  record,
  defs = [],
  onToggle
}: {
  record: T;
  defs?: ToggleDef[];
  onToggle: (key: string, newValue: boolean) => void;
}) {
  // Combine explicitly given defs with any found boolean fields in the record instance
  const allDefs = [...defs];
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

  if (allDefs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 items-center shrink-0">
      {allDefs.map(({ key, label, shortLabel }) => {
        const val = !!record[key];
        return (
          <Button
            key={key}
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-9 rounded-full transition-all border shrink-0 text-center flex items-center justify-center select-none shadow-sm",
              val
                ? "bg-primary/20 hover:bg-primary/30 border-primary/50 text-primary font-bold"
                : "bg-muted/40 hover:bg-muted/60 border-border text-muted-foreground/60 font-medium"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(key, !val);
            }}
            title={label}
          >
            <span className="text-[9px] sm:text-[10px] leading-none tracking-tight uppercase font-bold">
              {shortLabel}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
