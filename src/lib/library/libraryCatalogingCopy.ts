/** Shown whenever a librarian is adding or finishing a book in the catalog. */
export const LIBRARY_CATALOGING_HEADING = 'To finish this book';

export const LIBRARY_CATALOGING_STEPS = [
  'Print a sticker.',
  'Scan that sticker at the Librarian desk.',
] as const;

export const LIBRARY_CATALOGING_SHORT = 'Print a sticker, then scan it at the Librarian desk.';

/** Shown while checking Open Library / Google Books / isbnsearch. */
export const LIBRARY_ISBN_LIST_LOOKUP = 'Checking the usual book lists…';

/** Shown only after those lists miss and the slower AI fallback starts. */
export const LIBRARY_ISBN_AI_LOOKUP =
  'Those lists did not have this number. AI is doing an extra search now — this can take a little longer.';

export const LIBRARY_ISBN_AI_LOOKUP_SHORT = 'AI extra search — this takes longer';

export const LIBRARY_STORE_BARCODE_TITLE = 'That is not the book number';

export const LIBRARY_STORE_BARCODE_BODY =
  'That scan is a store sticker. It will not find the book you want. Look inside the front cover for the book number, or type the book name and we will try to fill in the rest.';

export const LIBRARY_STORE_BARCODE_SCAN_ISBN = 'I’ll scan the book number';

export const LIBRARY_STORE_BARCODE_TYPE_MANUAL = 'I’ll type the book in';

export const LIBRARY_STORE_BARCODE_MANUAL_HINT =
  'Type the book name below, then tap Find this book. We will look it up and fill in the rest.';
