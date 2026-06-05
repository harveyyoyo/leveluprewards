'use client';

import { useMemo } from 'react';
import type { Settings } from '@/components/providers/SettingsProvider';
import {
  normalizeStaffPortalTabValue,
  staffPortalAddOnTabs,
  staffPortalCoreTabs,
  staffPortalDefaultTab,
  staffPortalOrderMainTabs,
  staffPortalSortTabs,
  staffPortalTabsForRole,
} from './tabRegistry';
import type { StaffPortalRole, StaffPortalTabDef, StaffPortalTabView } from './types';

function toTabView(def: StaffPortalTabDef): StaffPortalTabView {
  return { value: def.value, label: def.label, icon: def.icon, title: def.title };
}

export type UseStaffPortalTabsOptions = {
  role: StaffPortalRole;
  settings: Settings;
  /** Admin: pinned add-on tab values shown in the main row */
  pinnedAddOnValues?: string[];
  /** Admin: persisted main tab order */
  mainTabOrder?: string[];
};

export type UseStaffPortalTabsResult = {
  /** Tabs in the primary nav row (core + pinned add-ons for admin). */
  mainTabs: StaffPortalTabView[];
  /** Add-on tabs shown in “Add more” (teacher) or unpinned admin add-ons. */
  addMoreTabs: StaffPortalTabView[];
  /** All enabled tab values for the role. */
  allTabValues: string[];
  defaultTab: string;
  coreTabs: StaffPortalTabView[];
  addOnTabDefs: StaffPortalTabDef[];
};

/**
 * Role-filtered staff portal tabs — admin and teacher share one registry + canonical order.
 */
export function useStaffPortalTabs(options: UseStaffPortalTabsOptions): UseStaffPortalTabsResult {
  const {
    role,
    settings,
    pinnedAddOnValues = [],
    mainTabOrder,
  } = options;

  return useMemo(() => {
    const allDefs = staffPortalTabsForRole(role, settings);
    const core = staffPortalCoreTabs(role, settings).map(toTabView);
    const addOnDefs = staffPortalAddOnTabs(role, settings);
    const addOnViews = addOnDefs.map(toTabView);

    if (role === 'secretary') {
      const main = core.filter((t) => t.value === 'coupons');
      return {
        mainTabs: main,
        addMoreTabs: [],
        allTabValues: main.map((t) => t.value),
        defaultTab: staffPortalDefaultTab(role, settings),
        coreTabs: main,
        addOnTabDefs: [],
      };
    }

    const pinnedSet = new Set(pinnedAddOnValues.map(normalizeStaffPortalTabValue));
    const pinnedExtras = addOnViews.filter((t) => pinnedSet.has(t.value));
    const availableMain = [...core, ...pinnedExtras];
    const main = staffPortalOrderMainTabs(availableMain, mainTabOrder);
    const mainValues = new Set(main.map((t) => t.value));
    const addMore = staffPortalSortTabs(addOnViews.filter((t) => !mainValues.has(t.value)));

    return {
      mainTabs: main,
      addMoreTabs: addMore,
      allTabValues: allDefs.map((t) => t.value),
      defaultTab: staffPortalDefaultTab(role, settings),
      coreTabs: core,
      addOnTabDefs: addOnDefs,
    };
  }, [role, settings, pinnedAddOnValues, mainTabOrder]);
}

export function staffPortalTabIsValid(
  tabId: string,
  allTabValues: string[],
): boolean {
  return allTabValues.includes(normalizeStaffPortalTabValue(tabId));
}
