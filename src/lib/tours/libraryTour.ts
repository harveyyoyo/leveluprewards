import type { IntroStep } from './types';

export const libraryTourSteps: IntroStep[] = [
  {
    id: 'library-welcome',
    title: 'Welcome to Your Library',
    body: "Let's take a quick look around. We'll highlight the three main areas right here on your screen.",
    onRoute: '/library',
  },
  {
    id: 'library-desk',
    title: 'Librarian Desk',
    body: 'Look up any book or student, see which books are currently borrowed or overdue, and help students check in or check out.',
    onRoute: '/library',
    target: 'library-hub-desk',
    requireTarget: false,
  },
  {
    id: 'library-catalog',
    title: 'Book Catalog',
    body: 'Your entire school book collection lives here. Search for titles, print spine labels, and quickly add new books to your shelves.',
    onRoute: '/library',
    target: 'library-hub-catalog',
    requireTarget: false,
  },
  {
    id: 'library-kiosk',
    title: 'Student Kiosk',
    body: 'A dedicated self-checkout screen where students scan their own badge and book barcode to borrow or return books independently.',
    onRoute: '/library',
    target: 'library-hub-kiosk',
    requireTarget: false,
  },
  {
    id: 'library-finish',
    title: 'Quick Tour Complete!',
    body: 'You know the three main library areas! Ready to explore the advanced tools like instant barcode scanning, printing spine stickers, reading levels, and shelf audits?',
    onRoute: '/library',
    offerNextTour: 'library-features',
  },
];
