import type { LibraryItem } from '@/lib/types';

/** Normalize barcode / UPC for storage and Firestore lookup (student scan uppercases input). */
export function normalizeLibraryUpc(raw: string): string {
  return raw.trim().toUpperCase();
}

export function libraryBarcodeForPrint(item: Pick<LibraryItem, 'upc'>): string {
  return normalizeLibraryUpc(item.upc);
}
