'use client';

import * as React from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { AdminMainTabsList } from '@/components/admin/AdminMainTabsList';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { StaffPortalTabView } from '@/lib/staffPortal';
import { staffPortalTabTriggerClassName } from './staffPortalNavStyles';

export type StaffPortalNavProps = {
  role: 'admin' | 'teacher' | 'secretary';
  activeTab: string;
  onTabChange: (value: string) => void;
  mainTabs: StaffPortalTabView[];
  addMoreTabs?: StaffPortalTabView[];
  /** Use admin sidebar layout (also reads from settings when `navLayout` omitted). */
  navLayout?: 'top' | 'sidebar';
  /** Optional “Add more” menu with checkboxes (admin feature pinning). */
  addMoreMenu?: React.ReactNode;
  className?: string;
};

/**
 * Unified staff portal tab navigation (same shell as admin: mobile select + AdminMainTabsList).
 */
export function StaffPortalNav({
  role,
  activeTab,
  onTabChange,
  mainTabs,
  addMoreTabs = [],
  navLayout = 'top',
  addMoreMenu,
  className,
}: StaffPortalNavProps) {
  const sidebar = navLayout === 'sidebar';
  const portalLabel =
    role === 'admin' ? 'Admin portal' : role === 'secretary' ? 'Coupon printing' : 'Teacher portal';

  if (mainTabs.length === 0) return null;

  const mobileSelectId =
    role === 'admin' ? 'admin-portal-section' : role === 'secretary' ? 'secretary-portal-section' : 'teacher-portal-section';

  const addMoreDropdown =
    addMoreMenu ??
    (addMoreTabs.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-sm font-bold text-foreground transition-all hover:bg-muted/60',
              sidebar ? 'h-10 w-full shrink-0 justify-center' : 'h-full shrink-0',
            )}
            title="Add more tabs"
            aria-label="Add more"
          >
            <Settings className="w-4 h-4" aria-hidden />
            Add more
            <ChevronDown className="w-4 h-4 opacity-70" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={sidebar ? 'start' : 'end'} className="min-w-[220px]">
          <div className="px-2 py-2">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
              Feature tabs
            </span>
          </div>
          <DropdownMenuSeparator />
          {addMoreTabs.map((t) => {
            const Icon = t.icon;
            return (
              <DropdownMenuItem
                key={t.value}
                className="gap-2 font-semibold"
                onSelect={() => onTabChange(t.value)}
              >
                <Icon className="h-4 w-4 opacity-75" aria-hidden />
                {t.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null);

  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-4', className)}>
      <div className={cn('w-full min-w-0', sidebar ? 'lg:hidden' : 'md:hidden')}>
        <Label htmlFor={mobileSelectId} className="sr-only">
          {portalLabel} section
        </Label>
        <Select value={activeTab} onValueChange={onTabChange}>
          <SelectTrigger
            id={mobileSelectId}
            className="h-12 w-full rounded-xl font-bold"
            aria-label={`${portalLabel} section`}
          >
            <SelectValue placeholder="Choose a section" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[min(70vh,440px)]">
            {mainTabs.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
            {addMoreTabs.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn('hidden w-full min-w-0', sidebar ? 'lg:block' : 'md:block')}>
        <AdminMainTabsList
          activeTabValue={activeTab}
          orientation={sidebar ? 'vertical' : 'horizontal'}
          autoScrollActiveTab={false}
          aria-label={`${portalLabel} main tabs`}
          endAction={addMoreDropdown}
        >
          {mainTabs.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className={staffPortalTabTriggerClassName(sidebar)}
                title={t.title ?? t.label}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                {t.label}
              </TabsTrigger>
            );
          })}
        </AdminMainTabsList>
      </div>
    </div>
  );
}
