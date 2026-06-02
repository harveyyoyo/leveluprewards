'use client';

import { ChevronDown, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StaffPortalTabView } from '@/lib/staffPortal';

type StaffPortalAddFeatureTabsMenuProps = {
  tabs: StaffPortalTabView[];
  onAddTab: (value: string) => void;
  align?: 'start' | 'end';
  className?: string;
};

/** Add-only menu — lists feature tabs not already in the sidebar. */
export function StaffPortalAddFeatureTabsMenu({
  tabs,
  onAddTab,
  align = 'start',
  className,
}: StaffPortalAddFeatureTabsMenuProps) {
  if (tabs.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            className ??
            'inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-sm font-bold text-foreground transition-all hover:bg-muted/60'
          }
          title="Add feature tab"
          aria-label="Add feature tab"
        >
          <Settings className="w-4 h-4" aria-hidden />
          Add more
          <ChevronDown className="w-4 h-4 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[240px]">
        <div className="px-2 py-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Add feature tab
          </span>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Pick a tab to show in your sidebar. Remove pinned tabs with the × on each tab.
          </p>
        </div>
        <DropdownMenuSeparator />
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <DropdownMenuItem
              key={t.value}
              className="gap-2 font-semibold"
              onSelect={() => onAddTab(t.value)}
            >
              <Icon className="h-4 w-4 opacity-75" aria-hidden />
              {t.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
