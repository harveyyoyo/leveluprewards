import {
  isRetailIsbnBarcode,
  primaryIsbnVariant,
  unwrapRepeatedBookScan,
  type LibraryCatalogHit,
} from '@/lib/library/libraryCatalogLookup';
import {
  generateGenreBarcode,
  type BarcodeNumberScheme,
  type LibraryGenreConfig,
} from '@/lib/library/libraryClassification';
import { generateLibraryBarcode, isSchoolLibraryBarcode, normalizeLibraryUpc } from '@/lib/library/libraryScanCode';

/** Trim wedge / keyboard input before intake handling. */
export function normalizeIntakeScanCode(raw: string): string {
  return unwrapRepeatedBookScan(raw.trim());
}

/** School LIB checkout stickers are not catalog intake barcodes. */
export function isBlockedLibraryIntakeBarcode(raw: string): boolean {
  return isSchoolLibraryBarcode(normalizeIntakeScanCode(raw));
}

/** Barcodes already on catalog items (ISBN field or checkout UPC) for duplicate detection. */
export function catalogScannedCodeSet(
  items: { isbn?: string | null; upc?: string | null }[] | null | undefined,
): Set<string> {
  const set = new Set<string>();
  for (const item of items ?? []) {
    for (const raw of [item.isbn, item.upc]) {
      const code = normalizeIntakeScanCode(raw ?? '');
      if (code) set.add(code.toUpperCase());
    }
  }
  return set;
}

export type IsbnLookupMeta = {
  aiConfigured: boolean;
  catalogHit?: boolean;
  aiAttempted?: boolean;
  /** When AI fallback ran: not_configured | matched | no_match | error */
  aiStatus?: 'not_configured' | 'matched' | 'no_match' | 'error';
  /** Set when aiStatus is 'error'. */
  aiError?: string;
};

export type IsbnLookupResult = {
  hit: LibraryCatalogHit | null;
  meta: IsbnLookupMeta;
};

export type IsbnLookupPhase = 'catalog' | 'ai';

export function isbnLookupRequestPath(isbn: string, phase: IsbnLookupPhase = 'catalog'): string {
  const params = new URLSearchParams({ isbn });
  if (phase === 'ai') params.set('phase', 'ai');
  return `/api/library/lookup-isbn?${params.toString()}`;
}

async function fetchIsbnLookupPhase(isbnDigits: string, phase: IsbnLookupPhase): Promise<IsbnLookupResult> {
  const empty: IsbnLookupResult = { hit: null, meta: { aiConfigured: false } };
  try {
    const res = await fetch(isbnLookupRequestPath(isbnDigits, phase));
    const json = (await res.json()) as {
      hit?: LibraryCatalogHit | null;
      meta?: IsbnLookupMeta;
      error?: string;
    };
    if (!res.ok) return empty;
    return {
      hit: json.hit ?? null,
      meta: json.meta ?? { aiConfigured: false },
    };
  } catch {
    return empty;
  }
}

/**
 * Check the usual book lists first. If they miss and AI is available, run the
 * slower extra search. Call `onPhase` so the page can say why it is waiting.
 */
export async function fetchCatalogHitByIsbn(
  isbnDigits: string,
  options?: { onPhase?: (phase: IsbnLookupPhase) => void },
): Promise<IsbnLookupResult> {
  options?.onPhase?.('catalog');
  const catalog = await fetchIsbnLookupPhase(isbnDigits, 'catalog');
  if (catalog.hit) return catalog;
  if (!catalog.meta.aiConfigured) return catalog;

  options?.onPhase?.('ai');
  const ai = await fetchIsbnLookupPhase(isbnDigits, 'ai');
  return {
    hit: ai.hit,
    meta: {
      ...catalog.meta,
      ...ai.meta,
      aiConfigured: true,
      catalogHit: false,
      aiAttempted: true,
    },
  };
}

/** Fetch online book catalog suggestions by title query. */
export async function fetchCatalogHitsByTitle(title: string): Promise<LibraryCatalogHit[]> {
  const trimmed = title.trim();
  if (trimmed.length < 2) return [];
  try {
    const res = await fetch(`/api/library/lookup-title?title=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { hits?: LibraryCatalogHit[] };
    return json.hits ?? [];
  } catch {
    return [];
  }
}


/** Whether checkout uses a school-generated LIB sticker vs the book's own barcode. */
export function usesLibCheckoutSticker(upc: string): boolean {
  return isSchoolLibraryBarcode(normalizeLibraryUpc(upc));
}

export function checkoutBarcodeSaveMessage(upc: string): string {
  if (usesLibCheckoutSticker(upc)) {
    return `Checkout barcode ${upc} — print a LIB sticker from the catalog.`;
  }
  return `Checkout uses the book barcode (${upc}) — no LIB sticker needed.`;
}

export async function generateUniqueLibraryUpc(
  upcTaken: (upc: string) => Promise<boolean>,
  maxAttempts = 8,
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateLibraryBarcode();
    if (!(await upcTaken(candidate))) return candidate;
  }
  return null;
}

/** True when this copy still needs a school genre barcode (blank or a store ISBN). */
export function copyNeedsGenreBarcode(upc?: string | null): boolean {
  const code = normalizeLibraryUpc(upc ?? '');
  if (!code) return true;
  return isRetailIsbnBarcode(code);
}

/** Checkout codes already on catalog copies (ignores archived rows and an optional copy). */
export function catalogCheckoutCodeSet(
  items: { id?: string; upc?: string | null; archived?: boolean }[] | null | undefined,
  excludeId?: string,
): Set<string> {
  const set = new Set<string>();
  for (const item of items ?? []) {
    if (item.archived) continue;
    if (excludeId && item.id === excludeId) continue;
    const code = normalizeLibraryUpc(item.upc ?? '');
    if (code) set.add(code);
  }
  return set;
}

export function isCatalogCheckoutCodeTaken(
  items: { id?: string; upc?: string | null; archived?: boolean }[] | null | undefined,
  upc: string,
  excludeId?: string,
): boolean {
  const code = normalizeLibraryUpc(upc);
  if (!code) return false;
  return catalogCheckoutCodeSet(items, excludeId).has(code);
}

/** Copy IDs whose checkout code is used by at least one other copy. */
export function duplicateCheckoutItemIds(
  items: { id?: string; upc?: string | null; archived?: boolean }[] | null | undefined,
): Set<string> {
  const byCode = new Map<string, string[]>();
  for (const item of items ?? []) {
    if (item.archived || !item.id) continue;
    const code = normalizeLibraryUpc(item.upc ?? '');
    if (!code) continue;
    const list = byCode.get(code) ?? [];
    list.push(item.id);
    byCode.set(code, list);
  }
  const ids = new Set<string>();
  for (const list of byCode.values()) {
    if (list.length < 2) continue;
    for (const id of list) ids.add(id);
  }
  return ids;
}

function collectKnownCodes(
  reserved: Set<string>,
  existingUpcs?: Iterable<string | null | undefined>,
): Set<string> {
  const known = new Set<string>();
  for (const raw of existingUpcs ?? []) {
    const code = normalizeLibraryUpc(raw ?? '');
    if (code) known.add(code);
  }
  for (const raw of reserved) {
    const code = normalizeLibraryUpc(raw);
    if (code) known.add(code);
  }
  return known;
}

export async function allocateNextGenreBarcode(options: {
  category?: string | null;
  scheme?: BarcodeNumberScheme;
  customGenres?: LibraryGenreConfig[] | null;
  upcTaken: (upc: string) => Promise<boolean>;
  reserved?: Set<string>;
  existingUpcs?: Iterable<string | null | undefined>;
}): Promise<string | null> {
  const reserved = options.reserved ?? new Set<string>();
  const scheme = options.scheme ?? 'genre_code';
  const known = collectKnownCodes(reserved, options.existingUpcs);

  if (scheme === 'classic_random') {
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = generateGenreBarcode({
        category: options.category,
        scheme,
        customGenres: options.customGenres,
        existingUpcs: known,
      });
      if (known.has(candidate) || reserved.has(candidate)) continue;
      if (!(await options.upcTaken(candidate))) {
        reserved.add(candidate);
        return candidate;
      }
      known.add(candidate);
    }
    return generateUniqueLibraryUpc(options.upcTaken);
  }

  let candidate = generateGenreBarcode({
    category: options.category,
    scheme,
    customGenres: options.customGenres,
    existingUpcs: known,
  });

  for (let attempt = 0; attempt < 500; attempt++) {
    if (!known.has(candidate) && !reserved.has(candidate) && !(await options.upcTaken(candidate))) {
      reserved.add(candidate);
      return candidate;
    }
    known.add(candidate);
    candidate = generateGenreBarcode({
      category: options.category,
      scheme,
      customGenres: options.customGenres,
      existingUpcs: known,
    });
  }
  return generateUniqueLibraryUpc(options.upcTaken);
}

/**
 * Use the book's own barcode for checkout when scanned; otherwise generate a LIB code.
 * Another catalog copy (or a manually-added item) can already occupy that exact
 * barcode as its checkout UPC — fall back to a generated LIB code for this copy
 * instead of failing the whole registration.
 */
export async function resolveIntakeCheckoutUpc(
  scannedBarcode: string | undefined,
  upcTaken: (upc: string) => Promise<boolean>,
): Promise<string | null> {
  const trimmed = normalizeIntakeScanCode(scannedBarcode ?? '');
  if (trimmed) {
    const upc = isRetailIsbnBarcode(trimmed)
      ? normalizeLibraryUpc(primaryIsbnVariant(trimmed))
      : normalizeLibraryUpc(trimmed);
    if (!(await upcTaken(upc))) return upc;
    return generateUniqueLibraryUpc(upcTaken);
  }
  return generateUniqueLibraryUpc(upcTaken);
}

export function createScanDeduper(cooldownMs = 2500) {
  let lastCode = '';
  let lastAt = 0;
  return (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return false;
    const now = Date.now();
    if (trimmed === lastCode && now - lastAt < cooldownMs) return false;
    lastCode = trimmed;
    lastAt = now;
    return true;
  };
}
