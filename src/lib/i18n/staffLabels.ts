import { resolveLabel } from '@/lib/i18n/resolveLabel';
import type { TranslationParams } from '@/lib/i18n/translate';
import type { StaffPortalTabView } from '@/lib/staffPortal/types';

type Translator = (key: string, params?: TranslationParams) => string;

export function translateStaffTabLabel(value: string, fallback: string, t: Translator): string {
  return resolveLabel(t, `staff.tabs.${value}`, fallback);
}

export function translateStaffTabTitle(value: string, fallback: string | undefined, t: Translator): string | undefined {
  if (!fallback) return undefined;
  return resolveLabel(t, `staff.tabTitles.${value}`, fallback);
}

export function localizeStaffPortalTabs<T extends StaffPortalTabView>(tabs: T[], t: Translator): T[] {
  return tabs.map((tab) => ({
    ...tab,
    label: translateStaffTabLabel(tab.value, tab.label, t),
    title: translateStaffTabTitle(tab.value, tab.title, t),
  }));
}
