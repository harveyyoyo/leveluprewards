import { useEffect } from 'react';

export const INTRO_TOUR_SELECT_STAFF_TAB_EVENT = 'intro-tour-select-staff-tab';

export type IntroTourSelectStaffTabDetail = {
  tabValue: string;
};

export function parseStaffTabFromIntroTourTarget(target?: string): string | null {
  if (!target?.startsWith('staff-tab-')) return null;
  return target.slice('staff-tab-'.length) || null;
}

export function dispatchIntroTourSelectStaffTab(tabValue: string): void {
  if (typeof window === 'undefined' || !tabValue) return;
  window.dispatchEvent(
    new CustomEvent<IntroTourSelectStaffTabDetail>(INTRO_TOUR_SELECT_STAFF_TAB_EVENT, {
      detail: { tabValue },
    }),
  );
}

/** Opens a staff portal sidebar tab when the welcome tour requests it. */
export function useIntroTourStaffTabListener(onSelect: (tabValue: string) => void): void {
  useEffect(() => {
    const handler = (event: Event) => {
      const tabValue = (event as CustomEvent<IntroTourSelectStaffTabDetail>).detail?.tabValue;
      if (typeof tabValue === 'string' && tabValue.trim()) {
        onSelect(tabValue.trim());
      }
    };
    window.addEventListener(INTRO_TOUR_SELECT_STAFF_TAB_EVENT, handler);
    return () => window.removeEventListener(INTRO_TOUR_SELECT_STAFF_TAB_EVENT, handler);
  }, [onSelect]);
}
