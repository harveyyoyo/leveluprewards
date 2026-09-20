import { APP_NAME } from '@/lib/appBranding';
import { STAFF_AI_HELP_TOUR_TARGET, WIZARD_HELP_BUTTON_CLOSING } from '@/lib/wizardHelpCopy';
import type { IntroStep } from './types';

export const welcomeTourSteps: IntroStep[] = [
  {
    id: 'welcome',
    title: `Welcome to ${APP_NAME}`,
    body: "Let's take a quick spin around your school rewards portal! We'll highlight the main areas right here on your screen.",
    onRoute: '/portal',
  },
  {
    id: 'portal-hub',
    title: 'Your Main Dashboard',
    body: 'This is your school front door. From here you and your team can hop into the Admin setup, Teacher tools, the Student Kiosk, and more.',
    onRoute: '/portal',
    target: 'portal-hub',
    requireTarget: false,
  },
  {
    id: 'portal-admin',
    title: 'Admin Setup',
    body: 'The Admin area is where you set up your school: add students, set up classrooms, invite staff, and pick prizes for your store.',
    onRoute: '/portal',
    target: 'portal-admin',
    requireTarget: false,
  },
  {
    id: 'portal-teacher',
    title: 'Teacher Tools',
    body: 'Teachers use this area every day to print point tickets, give out points, and hand out prizes that students have earned.',
    onRoute: '/portal',
    target: 'portal-print',
    requireTarget: false,
  },
  {
    id: 'portal-student',
    title: 'Student Kiosk',
    body: 'The kiosk is an arcade-style station where students scan their badges or tickets, check their points, and trade them for fun rewards.',
    onRoute: '/portal',
    target: 'portal-redeem',
    requireTarget: false,
  },
  {
    id: 'finish',
    title: 'Quick Tour Complete!',
    body: 'You now know the essentials! Ready to explore the coolest extra tools like hallway TV screens, school houses, library checkout, and classroom seating?',
    onRoute: '/portal',
    target: STAFF_AI_HELP_TOUR_TARGET,
    offerNextTour: 'features',
  },
];
