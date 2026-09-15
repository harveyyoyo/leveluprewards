import type { IntroStep } from './types';

export const libraryTourSteps: IntroStep[] = [
  {
    id: 'library-welcome',
    title: 'Welcome to Your Library',
    body: "Let's take a quick look around. We'll highlight the three main areas right here on the home screen.",
    onRoute: '/library',
  },
  {
    id: 'library-desk',
    title: 'Librarian Desk',
    body: 'Look up a book or a student here, see who has what checked out, and send someone to the Kiosk to borrow or return.',
    onRoute: '/library',
    target: 'library-hub-desk',
    requireTarget: true,
  },
  {
    id: 'library-catalog',
    title: 'Catalog',
    body: 'Your whole collection lives here. Scan or search for a book, print shelf labels, and add new books to the library.',
    onRoute: '/library',
    target: 'library-hub-catalog',
    requireTarget: true,
  },
  {
    id: 'library-kiosk',
    title: 'Student Kiosk',
    body: 'Students scan their own card here to borrow or return a book on their own, no librarian needed.',
    onRoute: '/library',
    target: 'library-hub-kiosk',
    requireTarget: true,
  },
  {
    id: 'library-finish',
    title: "That's the tour!",
    body: 'Explore any of the three doors whenever you like — the Home icon in the header always brings you back here.',
    onRoute: '/library',
  },
];
