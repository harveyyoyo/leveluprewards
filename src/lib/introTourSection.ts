import { useEffect } from 'react';

export const INTRO_TOUR_SELECT_SECTION_EVENT = 'intro-tour-select-section';

export type IntroTourSelectSectionDetail = {
  sectionId: string;
};

export function parseSectionFromIntroTourTarget(target?: string): string | null {
  if (!target?.startsWith('section-tab-')) return null;
  return target.slice('section-tab-'.length) || null;
}

export function dispatchIntroTourSelectSection(sectionId: string): void {
  if (typeof window === 'undefined' || !sectionId) return;
  window.dispatchEvent(
    new CustomEvent<IntroTourSelectSectionDetail>(INTRO_TOUR_SELECT_SECTION_EVENT, {
      detail: { sectionId },
    }),
  );
}

/** Opens a content section tab (e.g. Print coupons) when the tour requests it. */
export function useIntroTourSectionListener(onSelect: (sectionId: string) => void): void {
  useEffect(() => {
    const handler = (event: Event) => {
      const sectionId = (event as CustomEvent<IntroTourSelectSectionDetail>).detail?.sectionId;
      if (typeof sectionId === 'string' && sectionId.trim()) {
        onSelect(sectionId.trim());
      }
    };
    window.addEventListener(INTRO_TOUR_SELECT_SECTION_EVENT, handler);
    return () => window.removeEventListener(INTRO_TOUR_SELECT_SECTION_EVENT, handler);
  }, [onSelect]);
}
