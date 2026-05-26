'use client';

import { useMemo } from 'react';
import type { Settings } from '@/components/providers/SettingsProvider';
import {
  staffPortalAddOnTabs,
  staffPortalCoreTabs,
  staffPortalDefaultTab,
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
  /** Developer-only admin tab */
  includeDeveloperBackups?: boolean;
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

function orderTabs(
  available: StaffPortalTabView[],
  savedOrder: string[] | undefined,
): StaffPortalTabView[] {
  const byValue = new Map(available.map((t) => [t.value, t]));
  const out: StaffPortalTabView[] = [];
  const seen = new Set<string>();

  for (const v of savedOrder || []) {
    const def = byValue.get(v);
    if (!def || seen.has(def.value)) continue;
    out.push(def);
    seen.add(def.value);
  }

  for (const def of available) {
    if (seen.has(def.value)) continue;
    out.push(def);
    seen.add(def.value);
  }

  return out;
}

/**
 * Role-filtered staff portal tabs — admin and teacher share one registry.
 */
export function useStaffPortalTabs(options: UseStaffPortalTabsOptions): UseStaffPortalTabsResult {
  const {
    role,
    settings,
    pinnedAddOnValues = [],
    mainTabOrder,
    includeDeveloperBackups = false,
  } = options;

  return useMemo(() => {
    const allDefs = staffPortalTabsForRole(role, settings, { includeDeveloperBackups });
    const core = staffPortalCoreTabs(role, settings).map(toTabView);
    const addOnDefs = staffPortalAddOnTabs(role, settings);
    const addOnViews = addOnDefs.map(toTabView);

    if (role === 'secretary') {
      const main = core.filter((t) => t.value === 'coupons');
      return {
        mainTabs: main,
        addMoreTabs: [],
        allTabValues: main.map((t) => t.value),
        defaultTab: staffPortalDefaultTab(role),
        coreTabs: main,
        addOnTabDefs: [],
      };
    }

    if (role === 'teacher') {
      const main = orderTabs([...core], mainTabOrder);
      const mainValues = new Set(main.map((t) => t.value));
      const addMore = addOnViews.filter((t) => !mainValues.has(t.value));
      return {
        mainTabs: main,
        addMoreTabs: addMore,
        allTabValues: allDefs.map((t) => t.value),
        defaultTab: staffPortalDefaultTab(role),
        coreTabs: core,
        addOnTabDefs: addOnDefs,
      };
    }

    // Admin: core + pinned add-ons in main row; other enabled add-ons in “Add more”
    const pinnedSet = new Set(pinnedAddOnValues);
    const pinnedExtras = addOnViews.filter((t) => pinnedSet.has(t.value));
    const availableMain = [...core, ...pinnedExtras.map((t) => ({ ...t, title: `${t.label} (pinned)` }))];
    if (includeDeveloperBackups) {
      const backups = allDefs.find((t) => t.value === 'backups');
      if (backups && !availableMain.some((t) => t.value === 'backups')) {
        availableMain.push(toTabView(backups));
      }
    }
    const main = orderTabs(availableMain, mainTabOrder);
    const mainValues = new Set(main.map((t) => t.value));
    const addMore = addOnViews.filter((t) => !mainValues.has(t.value));

    return {
      mainTabs: main,
      addMoreTabs: addMore,
      allTabValues: allDefs.map((t) => t.value),
      defaultTab: staffPortalDefaultTab(role),
      coreTabs: core,
      addOnTabDefs: addOnDefs,
    };
  }, [role, settings, pinnedAddOnValues, mainTabOrder, includeDeveloperBackups]);
}

export function staffPortalTabIsValid(
  tabId: string,
  allTabValues: string[],
): boolean {
  return allTabValues.includes(tabId);
}
