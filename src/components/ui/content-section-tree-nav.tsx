'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type ContentSectionTreeItem = {
  id: string;
  label: string;
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
  'aria-label'?: string;
};

export function ContentSectionTreeNav({
  items,
  value,
  onValueChange,
  branchLabel,
  className,
  'aria-label': ariaLabel = 'Section',
}: ContentSectionTreeNavProps) {
  if (items.length < 2) return null;

  const colsClass =
    items.length === 5
      ? 'grid-cols-5'
      : items.length === 4
        ? 'grid-cols-4'
        : items.length === 3
          ? 'grid-cols-3'
          : items.length === 2
            ? 'grid-cols-2'
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
            'grid w-full max-w-2xl rounded-2xl bg-secondary/80 p-1 border border-border/40',
            colsClass
          )}
        >
          {items.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              className="group rounded-xl py-2 font-bold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-xs sm:text-sm"
            >
              {item.label}
              {item.badge !== undefined && item.badge !== '' && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black rounded-lg bg-muted text-muted-foreground group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground transition-all">
                  {item.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
