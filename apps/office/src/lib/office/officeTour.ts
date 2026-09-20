import { OFFICE_NAV_ITEMS } from '@/lib/office/officeNav';

export type OfficeTourStep = {
  id: string;
  title: string;
  body: string;
  /** Matches a `data-office-tour="<value>"` attribute on the element to highlight. Omit for a plain, centered step. */
  target?: string;
};

/**
 * One step per sidebar link, built from the same OFFICE_NAV_ITEMS the sidebar
 * itself renders (label/description), so the tour can't drift out of sync with
 * what's actually in the nav. A short welcome/closing step bookend it.
 */
export const OFFICE_TOUR_STEPS: OfficeTourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to School Office',
    body: "Here's a 30-second look at where everything lives. Use Next to move through it, or Skip tour at any time.",
  },
  ...OFFICE_NAV_ITEMS.map((item) => ({
    id: item.id,
    title: item.label,
    body: item.description,
    target: item.id,
  })),
  {
    id: 'done',
    title: "That's it!",
    body: 'You can retake this tour any time from the Home screen.',
  },
];
