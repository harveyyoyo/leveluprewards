import type { IntroStep } from './types';

/** Optional student-facing features schools can turn on. */
export const studentFeaturesTourSteps: IntroStep[] = [
  {
    id: 'student-features-intro',
    title: 'Student Home Portal',
    body: 'Want students checking points from home? Turn on the Student Home Portal in Admin under Add more.',
    onRoute: '/portal',
    target: 'portal-admin',
    advanceOnRoute: '/admin',
    navigateHint: 'Open the Admin Portal to see where this is configured.',
  },
  {
    id: 'student-features-addon',
    title: 'Enable from Admin',
    body: 'In Admin, open Add more and enable Student Home Portal. Students can then sign in from any browser to view points, goals, and badges.',
    onRoute: '/admin',
    target: 'addon-link-student-portal',
    requireTarget: false,
  },
];
