import type { StaffPortalTabInfoSection } from '@/components/staff/StaffPortalTabInfoPopover';

export const RECESS_TAB_INFO_SECTIONS: StaffPortalTabInfoSection[] = [
  {
    title: 'What is this for?',
    accent: 'default',
    body:
      'Live room-pass tracking inside Attendance. Students scan their ID at the kiosk, then scan a printed pass to leave and scan the same pass again to return. Staff see who is out now and a recent activity log — no manual checkout.',
  },
  {
    title: 'Use it when…',
    accent: 'emerald',
    bullets: [
      'A student scans a bathroom, break, water, nurse, or office pass at the kiosk.',
      'You need one shared answer to “who is out of the room right now?”',
      'You want a log of how long each trip took.',
    ],
  },
  {
    title: 'Keep in mind…',
    accent: 'amber',
    bullets: [
      'Checkout and return are scan-only at the student kiosk.',
      'Timers turn red past the limit; this tracks location, not points.',
      'Print passes and kiosk settings live under Attendance → Room passes.',
    ],
  },
];
