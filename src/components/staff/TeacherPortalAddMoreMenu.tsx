'use client';

import { ChevronDown, Settings as SettingsIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Settings } from '@/components/providers/SettingsProvider';
import { STAFF_PORTAL_TAB_REGISTRY } from '@/lib/staffPortal/tabRegistry';
import type { StaffPortalTabDef } from '@/lib/staffPortal/types';

const TEACHER_ADD_ON_MENU_DEFS: StaffPortalTabDef[] = STAFF_PORTAL_TAB_REGISTRY.filter(
  (t) => t.kind === 'addon' && t.roles.includes('teacher'),
);

export type TeacherPortalAddMoreMenuProps = {
  settings: Settings;
  navSidebar?: boolean;
  onTogglePinnedTab: (tabValue: string, pinned: boolean) => void;
};

/**
 * Teacher “Add more” — each teacher pins optional tabs into their own nav bar.
 */
export function TeacherPortalAddMoreMenu({
  settings,
  navSidebar = false,
  onTogglePinnedTab,
}: TeacherPortalAddMoreMenuProps) {
  const pinned = new Set(settings.teacherPinnedAddOnTabs || []);

  if (TEACHER_ADD_ON_MENU_DEFS.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-sm font-bold text-foreground transition-all hover:bg-muted/60',
            navSidebar ? 'h-10 w-full shrink-0 justify-center' : 'h-full shrink-0',
          )}
          title="Add more tabs"
          aria-label="Add more"
        >
          <SettingsIcon className="w-4 h-4" aria-hidden />
          Add more
          <ChevronDown className="w-4 h-4 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={navSidebar ? 'start' : 'end'} className="min-w-[260px]">
        <div className="px-2 py-2">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
            Feature tabs
          </span>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Check to show a tab in your bar. Uncheck to hide it — only affects your portal.
          </p>
        </div>
        <DropdownMenuSeparator />
        {TEACHER_ADD_ON_MENU_DEFS.map((t) => {
          const Icon = t.icon;
          const available = t.isEnabled(settings, 'teacher');
          const isPinned = pinned.has(t.value);
          const checked = available && isPinned;
          return (
            <DropdownMenuCheckboxItem
              key={t.value}
              checked={checked}
              disabled={!available}
              title={
                available
                  ? isPinned
                    ? 'Shown in your tab bar'
                    : 'Add to your tab bar'
                  : 'Not included in your school plan'
              }
              onCheckedChange={(next) => {
                if (!available) return;
                onTogglePinnedTab(t.value, !!next);
              }}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4 opacity-75" aria-hidden />
              <span className="flex-1">{t.label}</span>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
