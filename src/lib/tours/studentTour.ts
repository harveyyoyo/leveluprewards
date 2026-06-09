import type { IntroStep } from './types';

export const studentTourSteps: IntroStep[] = [
  {
    id: 'student-welcome',
    title: 'Student Kiosk',
    body: "Welcome to the Student Kiosk! This is a shared screen where students scan their ID cards or coupons to log in and bank their points.",
    onRoute: '/student',
  },
  {
    id: 'student-scan',
    title: 'Logging In',
    body: 'Students hold their QR code up to the camera or type their passcode. It instantly pulls up their profile.',
    onRoute: '/student',
    target: 'kiosk-wedge-camera-box',
    requireTarget: true,
  },
  {
    id: 'student-prizes',
    title: 'The Prize Shelf',
    body: 'Once logged in, students can browse your digital store and spend their points on whatever you have stocked!',
    onRoute: '/student',
  },
  {
    id: 'student-history',
    title: 'History & Balance',
    body: 'They can also check their current balance, recent earnings, and see what coupons they have already scanned.',
    onRoute: '/student',
  },
  {
    id: 'student-finish',
    title: 'All Set',
    body: 'You are ready to go! Start setting up your school from the Admin Portal.',
    onRoute: '/student',
  },
];
