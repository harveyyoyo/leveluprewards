import { describe, expect, it, vi } from 'vitest';
import {
  allocateNextGenreBarcode,
  catalogCheckoutCodeSet,
  catalogScannedCodeSet,
  checkoutBarcodeSaveMessage,
  copyNeedsGenreBarcode,
  duplicateCheckoutItemIds,
  isCatalogCheckoutCodeTaken,
  resolveIntakeCheckoutUpc,
  usesLibCheckoutSticker,
} from './libraryIntakeHelpers';

describe('libraryIntakeHelpers', () => {
  it('catalogScannedCodeSet includes both isbn and upc fields', () => {
    const set = catalogScannedCodeSet([
      { isbn: '9781422631157', upc: 'LIB00112233' },
      { isbn: null, upc: '012345678905' },
    ]);
    expect(set.has('9781422631157')).toBe(true);
    expect(set.has('LIB00112233')).toBe(true);
    expect(set.has('012345678905')).toBe(true);
  });

  it('resolveIntakeCheckoutUpc uses normalized ISBN-13 from a 12-digit scan', async () => {
    const upcTaken = vi.fn().mockResolvedValue(false);
    const upc = await resolveIntakeCheckoutUpc('978142263115', upcTaken);
    expect(upc).toBe('9781422631157');
    expect(upcTaken).toHaveBeenCalledWith('9781422631157');
  });

  it('resolveIntakeCheckoutUpc falls back to a generated LIB code when the book barcode is already taken', async () => {
    const upcTaken = vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
    const upc = await resolveIntakeCheckoutUpc('9781422631157', upcTaken);
    expect(upc).toMatch(/^LIB[0-9A-F]{8}$/);
  });

  it('resolveIntakeCheckoutUpc generates LIB when no barcode was scanned', async () => {
    const upcTaken = vi.fn().mockResolvedValue(false);
    const upc = await resolveIntakeCheckoutUpc('', upcTaken);
    expect(upc).toMatch(/^LIB[0-9A-F]{8}$/);
  });

  it('copyNeedsGenreBarcode is true for a blank code or a store ISBN', () => {
    expect(copyNeedsGenreBarcode('')).toBe(true);
    expect(copyNeedsGenreBarcode('9781419708572')).toBe(true);
    expect(copyNeedsGenreBarcode('FIC-823-0001')).toBe(false);
    expect(copyNeedsGenreBarcode('LIB00112233')).toBe(false);
  });

  it('catalogCheckoutCodeSet skips archived copies and an excluded id', () => {
    const set = catalogCheckoutCodeSet(
      [
        { id: 'a', upc: 'FIC-823-0001' },
        { id: 'b', upc: 'FIC-823-0002', archived: true },
        { id: 'c', upc: 'fic-823-0003' },
      ],
      'a',
    );
    expect(set.has('FIC-823-0001')).toBe(false);
    expect(set.has('FIC-823-0002')).toBe(false);
    expect(set.has('FIC-823-0003')).toBe(true);
  });

  it('duplicateCheckoutItemIds returns only copies that share a code', () => {
    const ids = duplicateCheckoutItemIds([
      { id: 'a', upc: 'FIC-823-0001' },
      { id: 'b', upc: 'FIC-823-0001' },
      { id: 'c', upc: 'FIC-823-0002' },
      { id: 'd', upc: 'FIC-823-0003', archived: true },
      { id: 'e', upc: 'FIC-823-0003', archived: true },
    ]);
    expect([...ids].sort()).toEqual(['a', 'b']);
  });

  it('isCatalogCheckoutCodeTaken finds a code already on another copy', () => {
    const items = [
      { id: 'a', upc: 'FIC-823-0001' },
      { id: 'b', upc: 'FIC-823-0002' },
    ];
    expect(isCatalogCheckoutCodeTaken(items, 'FIC-823-0001', 'b')).toBe(true);
    expect(isCatalogCheckoutCodeTaken(items, 'FIC-823-0001', 'a')).toBe(false);
  });

  it('allocateNextGenreBarcode hands out the next unused genre code', async () => {
    const taken = new Set(['FIC-823-0001', 'FIC-823-0002']);
    const first = await allocateNextGenreBarcode({
      category: 'Fiction',
      scheme: 'genre_code',
      existingUpcs: taken,
      upcTaken: async (code) => taken.has(code),
    });
    expect(first).toBe('FIC-823-0003');
    taken.add(first!);
    const reserved = new Set([first!]);
    const second = await allocateNextGenreBarcode({
      category: 'Fiction',
      scheme: 'genre_code',
      reserved,
      existingUpcs: taken,
      upcTaken: async (code) => taken.has(code),
    });
    expect(second).toBe('FIC-823-0004');
  });

  it('allocateNextGenreBarcode skips reserved codes even when upcTaken misses them', async () => {
    const reserved = new Set<string>();
    const first = await allocateNextGenreBarcode({
      category: 'Fiction',
      scheme: 'genre_code',
      reserved,
      upcTaken: async () => false,
    });
    const second = await allocateNextGenreBarcode({
      category: 'Fiction',
      scheme: 'genre_code',
      reserved,
      upcTaken: async () => false,
    });
    expect(first).toBe('FIC-823-0001');
    expect(second).toBe('FIC-823-0002');
  });

  it('checkoutBarcodeSaveMessage distinguishes LIB vs book barcodes', () => {
    expect(usesLibCheckoutSticker('LIB00112233')).toBe(true);
    expect(usesLibCheckoutSticker('9781422631157')).toBe(false);
    expect(checkoutBarcodeSaveMessage('9781422631157')).toContain('no LIB sticker');
    expect(checkoutBarcodeSaveMessage('LIB00112233')).toContain('print a LIB sticker');
  });
});
