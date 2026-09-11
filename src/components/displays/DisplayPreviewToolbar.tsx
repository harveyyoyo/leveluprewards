'use client';

import Link from 'next/link';
import { ArrowUpRight, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type OrientationOption<T extends string> = {
  id: T;
  label: string;
  shortLabel: string;
  icon: typeof Monitor;
};

type DisplayPreviewToolbarProps<T extends string> = {
  layout: T;
  options: readonly OrientationOption<T>[];
  onLayoutChange?: (layout: T) => void;
  openDisplayHref?: string;
  className?: string;
};

export function DisplayPreviewToolbar<T extends string>({
  layout,
  options,
  onLayoutChange,
  openDisplayHref,
  className,
}: DisplayPreviewToolbarProps<T>) {
  return (
    <div className={cn('flex shrink-0 flex-wrap items-center justify-end gap-1.5', className)}>
      {onLayoutChange ? (
        <div
          className="flex items-center rounded-lg border bg-muted/30 p-0.5"
          role="group"
          aria-label="Preview orientation"
        >
          {options.map((option) => {
            const Icon = option.icon;
            const active = layout === option.id;
            return (
              <Button
                key={option.id}
                type="button"
                size="sm"
                variant={active ? 'default' : 'ghost'}
                className={cn(
                  'h-7 gap-1 rounded-md px-2 text-[10px] font-bold uppercase tracking-wide',
                  !active && 'text-muted-foreground',
                )}
                onClick={() => onLayoutChange(option.id)}
                aria-pressed={active}
                title={option.label}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {option.shortLabel}
              </Button>
            );
          })}
        </div>
      ) : null}
      {openDisplayHref ? (
        <Button asChild variant="outline" size="sm" className="h-7 rounded-lg gap-1 px-2.5 text-xs">
          <Link href={openDisplayHref} target="_blank" rel="noopener noreferrer">
            Open display
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export const DISPLAY_PREVIEW_WIDE_TALL_OPTIONS = [
  { id: 'landscape' as const, label: 'Wide — landscape monitor', shortLabel: 'Wide', icon: Monitor },
  { id: 'portrait' as const, label: 'Tall — portrait monitor', shortLabel: 'Tall', icon: Smartphone },
];
