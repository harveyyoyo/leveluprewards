import type { IntroStep } from './types';

export const studentTourSteps: IntroStep[] = [
  {
    id: 'student-scan',
    title: 'Student Login',
    body: 'This is the kiosk login screen. Students scan their ID cards or coupons here to log in and bank points.',
    onRoute: '/student',
    target: 'kiosk-login',
    requireTarget: true,
  },
  {
    id: 'student-manual-login',
    title: 'Manual Entry',
    body: 'Tap Manual Entry, type 100 (the test student ID), then tap Identify Student.',
    onRoute: '/student',
    target: 'kiosk-login-type-tab',
    requireTarget: true,
    navigateHint: 'Switch to Manual Entry first.',
  },
  {
    id: 'student-test-id',
    title: 'Test Student',
    body: 'Enter 100 in the field, then tap Identify Student to log in as the test student.',
    onRoute: '/student',
    target: 'kiosk-login-id',
    requireTarget: true,
    navigateHint: 'Type 100 and tap Identify Student.',
  },
  {
    id: 'student-dashboard',
    title: 'Student View',
    body: 'After logging in, students see their balance, browse the prize shop, redeem coupons, and review their history — all from this screen.',
    onRoute: '/student',
    target: 'kiosk-redeem',
    advanceOnTarget: 'kiosk-redeem',
    navigateHint: 'Log in as the test student (ID 100) to see this screen.',
  },
  {
    id: 'student-finish',
    title: 'Try It Out!',
    body: 'That is the kiosk experience! Schools can also enable a Student Home Portal so students check points from home.',
    onRoute: '/student',
    offerNextTour: 'student-features',
  },
];
