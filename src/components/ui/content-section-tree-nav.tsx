'use client';

import type { ComponentType } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type ContentSectionTreeItem = {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** Shown in parentheses when provided (e.g. list count). */
  badge?: string | number;
};

type ContentSectionTreeNavProps = {
  items: ContentSectionTreeItem[];
  value: string;
  onValueChange: (id: string) => void;
  /** Optional parent label above the branch (e.g. tab title). */
  branchLabel?: string;
  /** @deprecated Kept for call-site compatibility. */
  decor?: 'tree' | 'plain';
  className?: string;
  /** When true, section tabs span the full content width (no max-w-2xl cap). */
  fullWidth?: boolean;
  'aria-label'?: string;
};

export function ContentSectionTreeNav({
  items,
  value,
  onValueChange,
  branchLabel,
  className,
  fullWidth = false,
  'aria-label': ariaLabel = 'Section',
}: ContentSectionTreeNavProps) {
  if (items.length < 2) return null;

  const colsClass =
    items.length >= 6
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
      : items.length === 5
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
      : items.length === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : items.length === 3
          ? 'grid-cols-1 sm:grid-cols-3'
          : items.length === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1';

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)} aria-label={ariaLabel}>
      {branchLabel ? (
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">
          {branchLabel}
        </p>
      ) : null}

      <Tabs value={value} onValueChange={onValueChange} className="w-full">
        <TabsList
          className={cn(
            'grid h-auto w-full gap-1 rounded-xl border border-border/50 bg-muted/50 p-1.5 shadow-inner',
            fullWidth ? 'max-w-none' : 'max-w-2xl',
            colsClass,
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className={cn(
                  'group flex min-h-11 w-full min-w-0 items-center justify-start gap-2 whitespace-normal rounded-lg border border-transparent px-3 py-2.5 text-left text-xs font-semibold leading-tight text-muted-foreground transition-[color,background-color,box-shadow,border-color] duration-200',
                  'hover:border-border/60 hover:bg-background/70 hover:text-foreground',
                  'data-[state=active]:border-primary/30 data-[state=active]:bg-primary data-[state=active]:font-black data-[state=active]:text-primary-foreground data-[state=active]:shadow-md',
                  'sm:justify-center sm:text-center sm:text-sm',
                )}
              >
                {Icon ? (
                  <Icon className="h-4 w-4 shrink-0 opacity-80 group-data-[state=active]:opacity-100" />
                ) : null}
                <span className="min-w-0">{item.label}</span>
                {item.badge !== undefined && item.badge !== '' && (
                  <span className="ml-auto shrink-0 rounded-lg bg-muted px-1.5 py-0.5 text-[9px] font-black text-muted-foreground group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground sm:ml-1">
                    {item.badge}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
