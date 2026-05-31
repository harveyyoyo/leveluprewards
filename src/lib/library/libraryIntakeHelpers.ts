import { generateLibraryBarcode } from '@/lib/library/libraryScanCode';
import type { LibraryCatalogHit } from '@/lib/library/libraryCatalogLookup';

export async function fetchCatalogHitByIsbn(isbnDigits: string): Promise<LibraryCatalogHit | null> {
  try {
    const res = await fetch(`/api/library/lookup-isbn?isbn=${encodeURIComponent(isbnDigits)}`);
    const json = (await res.json()) as { hit?: LibraryCatalogHit | null; error?: string };
    if (!res.ok) return null;
    return json.hit ?? null;
  } catch {
    return null;
  }
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
