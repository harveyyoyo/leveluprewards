import type { IntroStep } from './types';
import { STAFF_AI_HELP_TOUR_TARGET, WIZARD_HELP_BUTTON_CLOSING } from '@/lib/wizardHelpCopy';

export const libraryFeaturesTourSteps: IntroStep[] = [
  {
    id: 'library-features-intro',
    title: 'Advanced Library Tools',
    body: "Let's explore the powerful tools for adding books, printing stickers, organizing shelves, and running your school library!",
    onRoute: '/library',
  },
  {
    id: 'library-features-intake',
    title: 'Camera & Barcode Book Lookup',
    body: 'Scan any book barcode with your camera or handheld scanner. The system instantly loads the book cover, author, summary, and page count without typing!',
    onRoute: '/library',
    target: 'library-hub-catalog',
    requireTarget: false,
  },
  {
    id: 'library-features-labels',
    title: 'Printable Spine Labels & Stickers',
    body: 'Need labels for your books? Print barcode stickers and spine call-number labels directly from your browser onto standard adhesive sticker sheets.',
    onRoute: '/library',
    target: 'library-hub-catalog',
    requireTarget: false,
  },
  {
    id: 'library-features-reading-levels',
    title: 'Reading Levels & Genres',
    body: 'Sort books by Guided Reading, Lexile, or grade level, and organize shelves with color-coded genre tags so students quickly find the right book.',
    onRoute: '/library',
    target: 'library-hub-catalog',
    requireTarget: false,
  },
  {
    id: 'library-features-policy',
    title: 'Borrowing Limits & Due Dates',
    body: 'Set how many books each student can check out at once (such as 2 books for 14 days) and easily check who has books that need returning.',
    onRoute: '/library',
    target: 'library-hub-desk',
    requireTarget: false,
  },
  {
    id: 'library-features-self-checkout',
    title: 'Student Self-Checkout Station',
    body: 'Set up an independent checkout tablet where students scan their own badge and book barcode. Sound effects let kids know their loan is complete!',
    onRoute: '/library',
    target: 'library-hub-kiosk',
    requireTarget: false,
  },
  {
    id: 'library-features-audit',
    title: 'Quick Shelf Inventory Audits',
    body: 'Keep shelves neat in minutes: walk down the aisles scanning books to quickly spot any missing books or books put in the wrong place.',
    onRoute: '/library',
    target: 'library-hub-desk',
    requireTarget: false,
  },
  {
    id: 'library-features-finish',
    title: 'Your Library is Ready!',
    body: `Open the Catalog to add your first books, or head to the Librarian Desk to start checkouts. ${WIZARD_HELP_BUTTON_CLOSING}`,
    onRoute: '/library',
    target: STAFF_AI_HELP_TOUR_TARGET,
  },
];
