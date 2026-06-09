import { STAFF_AI_HELP_TOUR_TARGET } from '@/lib/wizardHelpCopy';
import type { IntroStep } from './types';

export const teacherTourSteps: IntroStep[] = [
  {
    id: 'teacher-welcome',
    title: 'Teacher Portal',
    body: 'Welcome to the Teacher Portal! Teachers come here to print point coupons, manage class rewards, and fulfill student prize redemptions.',
    onRoute: '/teacher',
    target: 'portal-print',
    navigateHint: 'Click the Teacher Portal card to begin!',
  },
  {
    id: 'teacher-points-tab',
    title: 'Give Points',
    body: 'Print sheets of scannable coupons here, or use "Manually Add" for quick digital awards.',
    onRoute: '/teacher',
    target: 'staff-tab-coupons',
    requireTarget: true,
  },
  {
    id: 'teacher-print-section',
    title: 'Print Coupons Tab',
    body: 'Click the "Print coupons" section at the top of the panel to see the print settings.',
    onRoute: '/teacher',
    target: 'section-tab-print',
    requireTarget: true,
    selectTab: 'coupons',
  },
  {
    id: 'teacher-print',
    title: 'Select Category',
    body: 'Just select a category and value, then generate a sheet of unique codes to hand out to students.',
    onRoute: '/teacher',
    target: 'coupon-print-panel',
    requireTarget: true,
    selectTab: 'coupons',
  },
  {
    id: 'teacher-generate',
    title: 'Generate!',
    body: 'This gives you a printable PDF of codes. Students will scan these at the kiosk to bank their points.',
    onRoute: '/teacher',
    target: 'coupon-generate-btn',
    requireTarget: true,
    selectTab: 'coupons',
  },
  {
    id: 'teacher-redemptions-tab',
    title: 'Prize Redemptions',
    body: 'When students buy physical prizes (like toys or homework passes), they show up here for you to approve.',
    onRoute: '/teacher',
    target: 'staff-tab-redemptions',
    requireTarget: true,
  },
  {
    id: 'teacher-finish',
    title: 'Need Help?',
    body: 'Click here anytime to ask our AI assistant for help or to contact tech support.',
    onRoute: '/teacher',
    target: STAFF_AI_HELP_TOUR_TARGET,
  },
];
