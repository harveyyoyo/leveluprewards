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
import { staffPortalTabByValue, type StaffPortalTabView } from '@/lib/staffPortal';
import { staffPortalTabTriggerClassName } from './staffPortalNavStyles';
import { StaffPortalAddFeatureTabsMenu } from './StaffPortalAddFeatureTabsMenu';
import { AdminMainTabsList } from '@/components/admin/AdminMainTabsList';
import { useTranslation } from '@/components/providers/LocaleProvider';
import { localizeStaffPortalTabs, translateStaffTabLabel } from '@/lib/i18n/staffLabels';
import { resolveLabel } from '@/lib/i18n/resolveLabel';
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
  const { t } = useTranslation();
  const portalLabel =
    role === 'admin'
      ? t('staff.nav.adminPortal')
      : role === 'secretary'
        ? t('staff.nav.couponPrinting')
        : t('staff.nav.teacherPortal');
  const localizedMainTabs = localizeStaffPortalTabs(mainTabs, t);
  const localizedAddMoreTabs = localizeStaffPortalTabs(addMoreTabs, t);
  const activeTabIsListed =
    localizedMainTabs.some((tab) => tab.value === activeTab) ||
    localizedAddMoreTabs.some((tab) => tab.value === activeTab);

  if (mainTabs.length === 0) return null;

  const mobileSelectId =
    role === 'admin' ? 'admin-portal-section' : role === 'secretary' ? 'secretary-portal-section' : 'teacher-portal-section';

  const handleTabSelect = (value: string) => {
    if (localizedMainTabs.some((tab) => tab.value === value)) {
      onTabChange(value);
      return;
    }
    const addTab = localizedAddMoreTabs.find((tab) => tab.value === value);
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
        tabs={localizedAddMoreTabs}
        onAddTab={onAddTab ?? onTabChange}
        onTurnAllOn={onTurnAllOn}
        onTurnAllOff={onTurnAllOff}
      />
    ) : null);

  return (
    <>
      <div className="lg:hidden" data-intro-tour="staff-nav-sidebar">
        <Label htmlFor={mobileSelectId} className="sr-only">
          {portalLabel} section
        </Label>
        <Select value={activeTab} onValueChange={handleTabSelect}>
          <SelectTrigger
            id={mobileSelectId}
            className="h-12 w-full rounded-xl font-bold"
            aria-label={`${portalLabel} section`}
          >
            <SelectValue placeholder={t('staff.nav.chooseSection')} />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[min(70vh,440px)]">
            <SelectGroup>
              <SelectLabel className="pl-8 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                {t('staff.nav.currentTabs')}
              </SelectLabel>
              {localizedMainTabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
              {activeTab && !activeTabIsListed ? (
                <SelectItem value={activeTab}>
                  {translateStaffTabLabel(
                    activeTab,
                    staffPortalTabByValue(activeTab)?.label ?? activeTab,
                    t,
                  )}
                </SelectItem>
              ) : null}
            </SelectGroup>
            {localizedAddMoreTabs.length > 0 ? (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="pl-8 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    {t('staff.nav.addMoreTabs')}
                  </SelectLabel>
                  {localizedAddMoreTabs.map((tab) => (
                    <SelectItem key={tab.value} value={tab.value}>
                      {tab.label}
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
          {localizedMainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            const removable = removableTabValues?.has(tab.value) ?? false;
            return (
              <StaffPortalSidebarTabRow
                key={tab.value}
                value={tab.value}
                isActive={isActive}
                onSelect={() => handleTabSelect(tab.value)}
                triggerClassName={staffPortalTabTriggerClassName()}
                title={tab.title ?? tab.label}
                removable={removable}
                removeLabel={resolveLabel(t, 'staff.nav.removeFromSidebar', 'Remove {label} from sidebar', {
                  label: tab.label,
                })}
                onRemove={removable && onRemoveTab ? () => onRemoveTab(tab.value) : undefined}
                wrapperClassName="flex w-full shrink-0"
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                {tab.label}
              </StaffPortalSidebarTabRow>
            );
          })}
        </AdminMainTabsList>
      </div>
    </>
  );
}
