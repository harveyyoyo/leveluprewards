'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StaffPortalTabView } from '@/lib/staffPortal';
import { staffPortalTabTriggerClassName } from './staffPortalNavStyles';
import { StaffPortalAddFeatureTabsMenu } from './StaffPortalAddFeatureTabsMenu';
import { AdminMainTabsList } from '@/components/admin/AdminMainTabsList';
import { StaffPortalSidebarTabRow } from './StaffPortalSidebarTabRow';

export type StaffPortalNavProps = {
  role: 'admin' | 'teacher' | 'secretary';
  activeTab: string;
  onTabChange: (value: string) => void;
  mainTabs: StaffPortalTabView[];
  addMoreTabs?: StaffPortalTabView[];
  /** Pin a feature tab into the sidebar (from Add more). */
  onAddTab?: (value: string) => void;
  /** Tab values that show a remove (×) control — pinned feature tabs only. */
  removableTabValues?: ReadonlySet<string>;
  onRemoveTab?: (value: string) => void;
  /** Optional custom Add more control. */
  addMoreMenu?: React.ReactNode;
  /** Pin every optional feature tab into the sidebar. */
  onTurnAllOn?: () => void;
  /** Remove every pinned optional feature tab from the sidebar. */
  onTurnAllOff?: () => void;
};

/**
 * Unified staff portal tab navigation (mobile select + vertical sidebar buttons).
 * Matches the admin workspace sidebar: rail tabs + Add more footer, page scroll (no inner scrollbar).
 */
export function StaffPortalNav({
  role,
  activeTab,
  onTabChange,
  mainTabs,
  addMoreTabs = [],
  onAddTab,
  removableTabValues,
  onRemoveTab,
  addMoreMenu,
  onTurnAllOn,
  onTurnAllOff,
}: StaffPortalNavProps) {
  const portalLabel =
    role === 'admin' ? 'Admin portal' : role === 'secretary' ? 'Coupon printing' : 'Teacher portal';

  if (mainTabs.length === 0) return null;

  const mobileSelectId =
    role === 'admin' ? 'admin-portal-section' : role === 'secretary' ? 'secretary-portal-section' : 'teacher-portal-section';

  const handleTabSelect = (value: string) => {
    if (mainTabs.some((t) => t.value === value)) {
      onTabChange(value);
      return;
    }
    const addTab = addMoreTabs.find((t) => t.value === value);
    if (addTab && onAddTab) {
      onAddTab(value);
      return;
    }
    onTabChange(value);
  };

  const addMoreDropdown =
    addMoreMenu ??
    (addMoreTabs.length > 0 || onTurnAllOn || onTurnAllOff ? (
      <StaffPortalAddFeatureTabsMenu
        tabs={addMoreTabs}
        onAddTab={onAddTab ?? onTabChange}
        onTurnAllOn={onTurnAllOn}
        onTurnAllOff={onTurnAllOff}
      />
    ) : null);

  return (
    <>
      <div className="lg:hidden">
        <Label htmlFor={mobileSelectId} className="sr-only">
          {portalLabel} section
        </Label>
        <Select value={activeTab} onValueChange={handleTabSelect}>
          <SelectTrigger
            id={mobileSelectId}
            className="h-12 w-full rounded-xl font-bold"
            aria-label={`${portalLabel} section`}
          >
            <SelectValue placeholder="Choose a section" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[min(70vh,440px)]">
            <SelectGroup>
              <SelectLabel className="pl-8 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Current tabs
              </SelectLabel>
              {mainTabs.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectGroup>
            {addMoreTabs.length > 0 ? (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="pl-8 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Add more tabs
                  </SelectLabel>
                  {addMoreTabs.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            ) : null}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden w-full min-w-0 lg:block">
        <AdminMainTabsList
          orientation="vertical"
          inWorkspace
          autoScrollActiveTab={false}
          activeTabValue={activeTab}
          aria-label={`${portalLabel} main tabs`}
          endAction={addMoreDropdown}
        >
          {mainTabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.value;
            const removable = removableTabValues?.has(t.value) ?? false;
            return (
              <StaffPortalSidebarTabRow
                key={t.value}
                value={t.value}
                isActive={isActive}
                onSelect={() => handleTabSelect(t.value)}
                triggerClassName={staffPortalTabTriggerClassName()}
                title={t.title ?? t.label}
                removable={removable}
                removeLabel={`Remove ${t.label} from sidebar`}
                onRemove={removable && onRemoveTab ? () => onRemoveTab(t.value) : undefined}
                wrapperClassName="flex w-full shrink-0"
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                {t.label}
              </StaffPortalSidebarTabRow>
            );
          })}
        </AdminMainTabsList>
      </div>
    </>
  );
}
