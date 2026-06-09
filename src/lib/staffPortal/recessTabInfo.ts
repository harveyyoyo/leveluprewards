import type { StaffPortalTabInfoSection } from '@/components/staff/StaffPortalTabInfoPopover';

export const RECESS_TAB_INFO_SECTIONS: StaffPortalTabInfoSection[] = [
  {
    title: 'What is this for?',
    accent: 'default',
    body:
      'A live sign-out sheet for short trips away from the room. Print pass cards with barcodes — students scan their ID at the kiosk, then scan a pass to leave and scan the same pass again to return. Staff can also check students out from this tab. Every trip is logged so any adult can see who is out and for how long.',
  },
  {
    title: 'Use it when…',
    accent: 'emerald',
    bullets: [
      'A student scans a bathroom, break, or water pass at the kiosk.',
      'You check someone out manually for the nurse or office.',
      'You need one shared answer to “who is out right now?”',
    ],
  },
  {
    title: 'Keep in mind…',
    accent: 'amber',
    bullets: [
      'Nothing appears on the student kiosk until a pass is scanned.',
      'Return is scan-only — same pass at the coupon scanner.',
      'Timers turn red past the limit; this tracks location, not points.',
      'For full-day attendance, use the Attendance tab instead.',
    ],
  },
];
