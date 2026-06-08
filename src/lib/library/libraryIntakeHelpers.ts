import {
  isRetailIsbnBarcode,
  primaryIsbnVariant,
  type LibraryCatalogHit,
} from '@/lib/library/libraryCatalogLookup';
import { generateLibraryBarcode, isSchoolLibraryBarcode, normalizeLibraryUpc } from '@/lib/library/libraryScanCode';

/** Trim wedge / keyboard input before intake handling. */
export function normalizeIntakeScanCode(raw: string): string {
  return raw.trim();
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

export async function fetchCatalogHitByIsbn(isbnDigits: string): Promise<IsbnLookupResult> {
  const empty: IsbnLookupResult = { hit: null, meta: { aiConfigured: false } };
  try {
    const res = await fetch(`/api/library/lookup-isbn?isbn=${encodeURIComponent(isbnDigits)}`);
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

/** Use the book's own barcode for checkout when scanned; otherwise generate a LIB code. */
export async function resolveIntakeCheckoutUpc(
  scannedBarcode: string | undefined,
  upcTaken: (upc: string) => Promise<boolean>,
): Promise<string | null> {
  const trimmed = normalizeIntakeScanCode(scannedBarcode ?? '');
  if (trimmed) {
    const upc = isRetailIsbnBarcode(trimmed)
      ? normalizeLibraryUpc(primaryIsbnVariant(trimmed))
      : normalizeLibraryUpc(trimmed);
    if (await upcTaken(upc)) return null;
    return upc;
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
