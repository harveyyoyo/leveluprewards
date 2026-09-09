/** Where a catalog hit came from. `ai` results are best-effort guesses that must be confirmed. */
export type LibraryCatalogSource = 'openlibrary' | 'google' | 'isbnsearch' | 'ai';

/** Best-effort metadata from Open Library, Google Books, or an AI fallback. */
export type LibraryCatalogHit = {
  title: string;
  author?: string;
  isbn?: string;
  category?: string;
  publisher?: string;
  publishedYear?: string;
  /** Origin of the data. `ai` means an unconfirmed guess the user should verify. */
  source?: LibraryCatalogSource;
};

export function normalizeIsbnDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Append EAN-13 check digit when a scanner omits the last digit (12-digit bookland code). */
function appendEan13CheckDigit(twelve: string): string | null {
  if (twelve.length !== 12 || (!twelve.startsWith('978') && !twelve.startsWith('979'))) return null;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(twelve[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${twelve}${check}`;
}

/** ISBN-13 (978/979…) → ISBN-10 for APIs that index both separately. */
export function isbn13ToIsbn10(isbn13: string): string | null {
  const d = normalizeIsbnDigits(isbn13);
  if (d.length !== 13 || (!d.startsWith('978') && !d.startsWith('979'))) return null;
  const nine = d.slice(3, 12);
  if (!/^\d{9}$/.test(nine)) return null;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(nine[i]) * (10 - i);
  const rem = sum % 11;
  const check = rem === 0 ? '0' : rem === 1 ? 'X' : String(11 - rem);
  return nine + check;
}

/** ISBN-10 → ISBN-13 (978 + 9 digits + EAN check). */
export function isbn10ToIsbn13(isbn10: string): string | null {
  const cleaned = normalizeIsbnDigits(isbn10).toUpperCase();
  if (cleaned.length !== 10) return null;
  const nine = cleaned.slice(0, 9);
  if (!/^\d{9}$/.test(nine)) return null;
  const body = `978${nine}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(body[i]);
    sum += n * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${body}${check}`;
}

/**
 * All ISBN/EAN forms to try when a wedge scanner sends 10-, 12-, or 13-digit codes.
 * (12-digit US book barcodes are often EAN-13 without the leading 0.)
 */
export function getIsbnLookupVariants(raw: string): string[] {
  const d = normalizeIsbnDigits(raw);
  const variants = new Set<string>();

  const add = (code: string) => {
    const n = normalizeIsbnDigits(code);
    if (n.length === 10 || n.length === 13) variants.add(n);
  };

  if (!d) return [];

  add(d);

  if (d.length === 12) {
    add(`0${d}`);
    const withCheck = appendEan13CheckDigit(d);
    if (withCheck) add(withCheck);
  }

  if (d.length === 13) {
    const ten = isbn13ToIsbn10(d);
    if (ten) add(ten);
  }

  if (d.length === 10) {
    const thirteen = isbn10ToIsbn13(d);
    if (thirteen) add(thirteen);
  }

  if (d.length > 13) {
    add(d.slice(-13));
    add(d.slice(-10));
  }

  return [...variants];
}

/** True when the scanned code can be resolved to an ISBN lookup (10/12/13 digit book barcodes). */
export function isRetailIsbnBarcode(raw: string): boolean {
  return getIsbnLookupVariants(raw).length > 0;
}

/** Prefer ISBN-13 for storage/display after a scan. */
export function primaryIsbnVariant(raw: string): string {
  const variants = getIsbnLookupVariants(raw);
  return (
    variants.find((v) => v.length === 13 && (v.startsWith('978') || v.startsWith('979'))) ??
    variants.find((v) => v.length === 13) ??
    variants[0] ??
    normalizeIsbnDigits(raw)
  );
}

function pickIsbn(identifiers: Record<string, string[]> | undefined): string | undefined {
  if (!identifiers) return undefined;
  return identifiers.isbn_13?.[0] || identifiers.isbn_10?.[0];
}

type OpenLibraryDataBook = {
  title?: string;
  authors?: { name: string }[];
  subjects?: { name: string }[];
  publishers?: string[];
  publish_date?: string;
  identifiers?: Record<string, string[]>;
};

function hitFromOpenLibraryBook(book: OpenLibraryDataBook, fallbackIsbn: string): LibraryCatalogHit | null {
  if (!book?.title) return null;
  return {
    title: book.title.trim(),
    author: book.authors?.[0]?.name?.trim(),
    isbn: pickIsbn(book.identifiers) || fallbackIsbn,
    category: book.subjects?.[0]?.name?.trim(),
    publisher: book.publishers?.[0]?.trim(),
    publishedYear: book.publish_date?.trim(),
    source: 'openlibrary',
  };
}

/**
 * Open Library throttles requests that omit a descriptive User-Agent, and
 * Google Books rate-limits (HTTP 429) anonymous traffic. A descriptive UA plus
 * an optional Google Books API key make catalog lookups far more reliable.
 */
const CATALOG_LOOKUP_USER_AGENT =
  'LevelUpRewards-Library/1.0 (+https://leveluprewards.app; school library intake)';

function googleBooksApiKey(): string | undefined {
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  return key ? key : undefined;
}

/**
 * Race a set of lookups and resolve with the first truthy result. Unlike
 * `Promise.any`, a task resolving with `null` (no match) doesn't win the race —
 * we keep waiting on the remaining tasks until one hits or all come back empty.
 * This turns a chain of sequential fallback lookups into one bounded by the
 * slowest task instead of the sum of every task's latency.
 */
export async function firstHit<T>(tasks: Array<() => Promise<T | null>>): Promise<T | null> {
  if (!tasks.length) return null;
  return new Promise((resolve) => {
    let remaining = tasks.length;
    const settle = (result: T | null) => {
      if (result) {
        resolve(result);
        return;
      }
      remaining -= 1;
      if (remaining === 0) resolve(null);
    };
    for (const task of tasks) {
      task().then(settle).catch(() => settle(null));
    }
  });
}

async function lookupOpenLibrary(variants: string[]): Promise<LibraryCatalogHit | null> {
  if (!variants.length) return null;
  const bibkeys = variants.map((v) => `ISBN:${v}`).join(',');
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(bibkeys)}&format=json&jscmd=data`;
  const res = await fetch(url, {
    headers: { 'User-Agent': CATALOG_LOOKUP_USER_AGENT },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, OpenLibraryDataBook>;
  for (const key of Object.keys(data)) {
    const hit = hitFromOpenLibraryBook(data[key], variants[0]);
    if (hit) return hit;
  }
  return null;
}

async function lookupOpenLibrarySearchVariant(isbn: string): Promise<LibraryCatalogHit | null> {
  const url = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&limit=1&fields=title,author_name,isbn,subject`;
  const res = await fetch(url, {
    headers: { 'User-Agent': CATALOG_LOOKUP_USER_AGENT },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    docs?: { title?: string; author_name?: string[]; isbn?: string[]; subject?: string[] }[];
  };
  const doc = data.docs?.[0];
  if (!doc?.title) return null;
  return {
    title: doc.title.trim(),
    author: doc.author_name?.[0]?.trim(),
    isbn: doc.isbn?.[0] || isbn,
    category: doc.subject?.[0]?.trim(),
    source: 'openlibrary',
  };
}

async function lookupOpenLibrarySearch(variants: string[]): Promise<LibraryCatalogHit | null> {
  return firstHit(variants.map((isbn) => () => lookupOpenLibrarySearchVariant(isbn)));
}

/** Parse isbnsearch.org book page HTML (used by lookupIsbnSearchOrg and tests). */
export function parseIsbnSearchOrgHtml(html: string, fallbackIsbn: string): LibraryCatalogHit | null {
  const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim();
  if (!title) return null;
  const author = html.match(/<strong>Author:<\/strong>\s*([^<]+)/i)?.[1]?.trim();
  const publisher = html.match(/<strong>Publisher:<\/strong>\s*([^<]+)/i)?.[1]?.trim();
  const publishedYear = html.match(/<strong>Published:<\/strong>\s*(\d{4})/i)?.[1]?.trim();
  return {
    title,
    author: author || undefined,
    isbn: fallbackIsbn,
    publisher: publisher || undefined,
    publishedYear: publishedYear || undefined,
    source: 'isbnsearch',
  };
}

async function lookupIsbnSearchOrgVariant(isbn: string): Promise<LibraryCatalogHit | null> {
  const url = `https://isbnsearch.org/isbn/${encodeURIComponent(isbn)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': CATALOG_LOOKUP_USER_AGENT },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return parseIsbnSearchOrgHtml(await res.text(), isbn);
}

async function lookupIsbnSearchOrg(variants: string[]): Promise<LibraryCatalogHit | null> {
  return firstHit(variants.map((isbn) => () => lookupIsbnSearchOrgVariant(isbn)));
}

async function lookupGoogleBooksVariant(isbn: string, apiKey: string | undefined): Promise<LibraryCatalogHit | null> {
  // `country` is required by the Google Books API; an API key avoids the
  // aggressive 429 rate limiting applied to anonymous requests.
  const params = new URLSearchParams({ q: `isbn:${isbn}`, maxResults: '1', country: 'US' });
  if (apiKey) params.set('key', apiKey);
  const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': CATALOG_LOOKUP_USER_AGENT },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    items?: {
      volumeInfo?: {
        title?: string;
        authors?: string[];
        categories?: string[];
        publisher?: string;
        publishedDate?: string;
        industryIdentifiers?: { type?: string; identifier?: string }[];
      };
    }[];
  };
  const info = data.items?.[0]?.volumeInfo;
  if (!info?.title) return null;
  const fromIds =
    info.industryIdentifiers?.find((id) => id.type === 'ISBN_13')?.identifier ||
    info.industryIdentifiers?.find((id) => id.type === 'ISBN_10')?.identifier;
  return {
    title: info.title.trim(),
    author: info.authors?.[0]?.trim(),
    isbn: fromIds || isbn,
    category: info.categories?.[0]?.trim(),
    publisher: info.publisher?.trim(),
    publishedYear: info.publishedDate?.slice(0, 4),
    source: 'google',
  };
}

async function lookupGoogleBooks(variants: string[]): Promise<LibraryCatalogHit | null> {
  const apiKey = googleBooksApiKey();
  return firstHit(variants.map((isbn) => () => lookupGoogleBooksVariant(isbn, apiKey)));
}

/**
 * Lookup title/author/category from the internet using ISBN-10/13 (and common EAN)
 * barcodes. All catalog sources (and, within each, all ISBN variants) are queried
 * concurrently — the first one to report a hit wins, so total latency is bounded by
 * the slowest single request instead of the sum of every source's round-trip.
 */
export async function lookupBookByIsbn(isbnRaw: string): Promise<LibraryCatalogHit | null> {
  const variants = getIsbnLookupVariants(isbnRaw);
  if (!variants.length) return null;

  return firstHit<LibraryCatalogHit>([
    () => lookupOpenLibrary(variants),
    () => lookupOpenLibrarySearch(variants),
    () => lookupGoogleBooks(variants),
    () => lookupIsbnSearchOrg(variants),
  ]);
}

/** Build a set of normalized ISBNs already in the school catalog. */
export function catalogIsbnSet(items: { isbn?: string | null }[] | null | undefined): Set<string> {
  const set = new Set<string>();
  for (const item of items ?? []) {
    for (const v of getIsbnLookupVariants(item.isbn ?? '')) {
      set.add(v);
    }
  }
  return set;
}
