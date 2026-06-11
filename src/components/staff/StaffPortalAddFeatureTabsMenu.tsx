'use client';

import type { CSSProperties } from 'react';
import { ChevronDown, Power, PowerOff, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { StaffPortalTabView } from '@/lib/staffPortal';
import { useTranslation } from '@/components/providers/LocaleProvider';

type StaffPortalAddFeatureTabsMenuProps = {
  tabs: StaffPortalTabView[];
  onAddTab: (value: string) => void;
  /** Enable every optional feature tab (admin: feature flags + sidebar pins). */
  onTurnAllOn?: () => void;
  /** Disable every optional feature tab currently on. */
  onTurnAllOff?: () => void;
  align?: 'start' | 'end';
  className?: string;
  getTabStyle?: (value: string) => CSSProperties | undefined;
};

/** Add-only menu — lists feature tabs not already in the sidebar. */
export function StaffPortalAddFeatureTabsMenu({
  tabs,
  onAddTab,
  onTurnAllOn,
  onTurnAllOff,
  align = 'start',
  className,
  getTabStyle,
}: StaffPortalAddFeatureTabsMenuProps) {
  const { t } = useTranslation();
  const hasBulkActions = !!(onTurnAllOn || onTurnAllOff);
  if (tabs.length === 0 && !hasBulkActions) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            className ??
            'inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/40 hover:text-foreground'
          }
          title="Add feature tab"
          aria-label="Add feature tab"
        >
          <Settings className="w-4 h-4" aria-hidden />
          {t('staff.nav.addMore')}
          <ChevronDown className="w-4 h-4 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="max-h-[min(70vh,28rem)] min-w-[240px] overflow-y-auto"
      >
        <div className="px-2 py-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Add feature tab
          </span>
        </div>
        <DropdownMenuSeparator />
        {onTurnAllOn ? (
          <DropdownMenuItem className="gap-2 font-semibold" onSelect={() => onTurnAllOn()}>
            <Power className="h-4 w-4 opacity-75" aria-hidden />
            {t('staff.nav.turnAllOn')}
          </DropdownMenuItem>
        ) : null}
        {onTurnAllOff ? (
          <DropdownMenuItem className="gap-2 font-semibold" onSelect={() => onTurnAllOff()}>
            <PowerOff className="h-4 w-4 opacity-75" aria-hidden />
            {t('staff.nav.turnAllOff')}
          </DropdownMenuItem>
        ) : null}
        {hasBulkActions && tabs.length > 0 ? <DropdownMenuSeparator /> : null}
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <DropdownMenuItem
              key={tab.value}
              className={cn('gap-2 font-semibold', getTabStyle && 'rounded-md')}
              style={getTabStyle?.(tab.value)}
              onSelect={() => onAddTab(tab.value)}
            >
              <Icon className="h-4 w-4 opacity-75" aria-hidden />
              {tab.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
