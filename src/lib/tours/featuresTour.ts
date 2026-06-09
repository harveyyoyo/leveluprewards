import type { IntroStep } from './types';
import { STAFF_AI_HELP_TOUR_TARGET, WIZARD_HELP_BUTTON_CLOSING } from '@/lib/wizardHelpCopy';

export const featuresTourSteps: IntroStep[] = [
  {
    id: 'features-intro',
    title: 'Advanced Features Tour',
    body: "Ready to level up? Let's explore some of the powerful add-on modules you can use to engage students.",
    onRoute: '/portal',
  },
  {
    id: 'features-admin',
    title: 'Head to Admin',
    body: 'Most of these features are turned on and configured in the Admin Portal.',
    onRoute: '/portal',
    target: 'portal-admin',
    advanceOnRoute: '/admin',
    navigateHint: 'Tap the Admin Portal card to get started.',
  },
  {
    id: 'features-houses',
    title: 'House System',
    body: 'Bring some friendly competition to your school! Assign students to Houses and track live standings based on their points.',
    onRoute: '/admin',
    target: 'staff-tab-houses',
    requireTarget: true,
  },
  {
    id: 'features-goals',
    title: 'Student Goals',
    body: 'Want to encourage saving? Enable Goals so students can lock in a target prize and track their progress toward it.',
    onRoute: '/admin',
    target: 'staff-tab-goals',
    requireTarget: true,
  },
  {
    id: 'features-library',
    title: 'Library System',
    body: 'A full barcode-driven library system. Scan books to check them out to students, set due dates, and track overdues.',
    onRoute: '/admin',
    target: 'staff-tab-library',
    requireTarget: true,
  },
  {
    id: 'features-displays',
    title: 'Public Displays',
    body: 'Cast live leaderboards to your hallway TVs. You can customize the look and rotate through top earners or house standings.',
    onRoute: '/admin',
    target: 'staff-tab-displays',
    requireTarget: true,
  },
  {
    id: 'features-student-portal',
    title: 'Student Home Portal',
    body: 'Turn this on to give students access from home. They can check their points, goals, and badges anytime.',
    onRoute: '/admin',
    target: 'staff-tab-student-portal',
    requireTarget: true,
  },
  {
    id: 'features-finish',
    title: 'Explore!',
    body: `There's plenty more to discover under "Add more". Enable the features that fit your school best! ${WIZARD_HELP_BUTTON_CLOSING}`,
    extraRoutes: ['/portal', '/hall-of-fame', '/student-home', '/admin', '/teacher', '/student'],
    target: STAFF_AI_HELP_TOUR_TARGET,
  },
];
