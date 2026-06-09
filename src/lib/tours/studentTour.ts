import type { IntroStep } from './types';

export const studentTourSteps: IntroStep[] = [
  {
    id: 'student-welcome',
    title: 'Student Kiosk',
    body: "Welcome to the Student Kiosk! This is a shared screen where students scan their ID cards or coupons to log in and bank their points.",
    onRoute: '/student',
    target: 'portal-redeem',
    navigateHint: 'Click the Student Kiosk card to begin!',
  },
  {
    id: 'student-scan',
    title: 'Logging In',
    body: 'This is the main login screen. If you have a webcam, students just hold their QR code up to it. It instantly pulls up their profile.',
    onRoute: '/student',
    target: 'kiosk-login',
    requireTarget: true,
  },
  {
    id: 'student-manual-login',
    title: 'Manual Passcode',
    body: 'If a student forgets their card, they can tap here to log in using a Passcode instead.',
    onRoute: '/student',
    target: 'kiosk-login-type-tab',
    requireTarget: true,
  },
  {
    id: 'student-finish',
    title: 'Try it out!',
    body: 'Once logged in, students can browse the digital store, view their history, and bank their coupons. Try logging in as one of your students to see it for yourself! When you are done, click the home button to return to the Admin Portal.',
    onRoute: '/student',
  },
];
