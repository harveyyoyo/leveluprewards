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
import {
  isStaffPortalTabOnDisplayMode,
  staffPortalMobileDefaultTab,
  type ResolvedDisplayMode,
} from '@/lib/displayMode';

function toTabView(def: StaffPortalTabDef): StaffPortalTabView {
  return { value: def.value, label: def.label, icon: def.icon, title: def.title };
}

export type UseStaffPortalTabsOptions = {
  role: StaffPortalRole;
  settings: Settings;
  /** Resolved layout mode (`web` | `app` | `mobile`) for mobile tab trimming. */
  resolvedDisplayMode?: ResolvedDisplayMode;
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

function filterTabsForDisplayMode(
  tabs: StaffPortalTabView[],
  role: StaffPortalRole,
  resolvedDisplayMode?: ResolvedDisplayMode,
): StaffPortalTabView[] {
  if (!resolvedDisplayMode) return tabs;
  return tabs.filter((tab) => isStaffPortalTabOnDisplayMode(tab.value, role, resolvedDisplayMode));
}

/**
 * Role-filtered staff portal tabs — admin and teacher share one registry + canonical order.
 */
export function useStaffPortalTabs(options: UseStaffPortalTabsOptions): UseStaffPortalTabsResult {
  const {
    role,
    settings,
    resolvedDisplayMode,
    pinnedAddOnValues = [],
    mainTabOrder,
  } = options;

  return useMemo(() => {
    const allDefs = staffPortalTabsForRole(role, settings);
    const core = staffPortalCoreTabs(role, settings).map(toTabView);
    const addOnDefs = staffPortalAddOnTabs(role, settings);
    const addOnViews = addOnDefs.map(toTabView);

    if (role === 'secretary') {
      const main = filterTabsForDisplayMode(
        core.filter((t) => t.value === 'coupons'),
        role,
        resolvedDisplayMode,
      );
      const allTabValues = filterTabsForDisplayMode(main, role, resolvedDisplayMode).map((t) => t.value);
      return {
        mainTabs: main,
        addMoreTabs: [],
        allTabValues,
        defaultTab: staffPortalMobileDefaultTab(role, allTabValues),
        coreTabs: main,
        addOnTabDefs: [],
      };
    }

    const pinnedSet = new Set(pinnedAddOnValues.map(normalizeStaffPortalTabValue));
    const pinnedExtras = addOnViews.filter((t) => pinnedSet.has(t.value));
    const availableMain = [...core, ...pinnedExtras];
    const main = filterTabsForDisplayMode(
      staffPortalOrderMainTabs(availableMain, mainTabOrder),
      role,
      resolvedDisplayMode,
    );
    const mainValues = new Set(main.map((t) => t.value));
    const addMore = filterTabsForDisplayMode(
      staffPortalSortTabs(addOnViews.filter((t) => !mainValues.has(t.value))),
      role,
      resolvedDisplayMode,
    );
    const allTabValues = filterTabsForDisplayMode(
      allDefs.map(toTabView),
      role,
      resolvedDisplayMode,
    ).map((t) => t.value);
    const defaultTab =
      resolvedDisplayMode === 'mobile'
        ? staffPortalMobileDefaultTab(role, allTabValues)
        : staffPortalDefaultTab(role, settings);

    return {
      mainTabs: main,
      addMoreTabs: addMore,
      allTabValues,
      defaultTab,
      coreTabs: filterTabsForDisplayMode(core, role, resolvedDisplayMode),
      addOnTabDefs: addOnDefs,
    };
  }, [role, settings, resolvedDisplayMode, pinnedAddOnValues, mainTabOrder]);
}

export function staffPortalTabIsValid(
  tabId: string,
  allTabValues: string[],
): boolean {
  return allTabValues.includes(normalizeStaffPortalTabValue(tabId));
}
