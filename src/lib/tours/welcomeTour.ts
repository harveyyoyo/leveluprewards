import { APP_NAME } from '@/lib/appBranding';
import { STAFF_AI_HELP_TOUR_TARGET, WIZARD_HELP_BUTTON_CLOSING } from '@/lib/wizardHelpCopy';
import type { IntroStep } from './types';

export const welcomeTourSteps: IntroStep[] = [
  {
    id: 'welcome',
    title: `Welcome to ${APP_NAME}`,
    body: "Let's take a quick spin around your new school rewards portal! We'll highlight the key areas right here on the dashboard.",
    onRoute: '/portal',
  },
  {
    id: 'portal-hub',
    title: 'Your School Portal',
    body: 'This is the front door. From here you can jump to your Admin setup, Teacher tools, Student Kiosk, and more.',
    onRoute: '/portal',
    target: 'portal-hub',
    requireTarget: true,
  },
  {
    id: 'portal-admin',
    title: 'Admin Portal',
    body: 'The Admin Portal is where you build your school — load students, define classes, add staff, and set up your reward point categories.',
    onRoute: '/portal',
    target: 'portal-admin',
    requireTarget: true,
  },
  {
    id: 'portal-teacher',
    title: 'Teacher Portal',
    body: 'Teachers come here to print point coupons, manage class rewards, give points, and fulfill student prize redemptions.',
    onRoute: '/portal',
    target: 'portal-print',
    requireTarget: true,
  },
  {
    id: 'portal-student',
    title: 'Student Kiosk',
    body: 'The kiosk is a shared screen where students can scan their ID cards or coupons to log in and bank their points.',
    onRoute: '/portal',
    target: 'portal-redeem',
    requireTarget: true,
  },
  {
    id: 'finish',
    title: 'Choose Your Next Step!',
    body: `That's the overview! To dive deeper, click the "Welcome Tour" button on any of these cards, or ask ${WIZARD_HELP_BUTTON_CLOSING} to launch the Features Tour.`,
    onRoute: '/portal',
    target: STAFF_AI_HELP_TOUR_TARGET,
  },
];
