import { describe, expect, it, vi } from 'vitest';
import { catalogScannedCodeSet, checkoutBarcodeSaveMessage, resolveIntakeCheckoutUpc, usesLibCheckoutSticker } from './libraryIntakeHelpers';

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

  it('resolveIntakeCheckoutUpc returns null when the book barcode is taken', async () => {
    const upcTaken = vi.fn().mockResolvedValue(true);
    const upc = await resolveIntakeCheckoutUpc('9781422631157', upcTaken);
    expect(upc).toBeNull();
  });

  it('resolveIntakeCheckoutUpc generates LIB when no barcode was scanned', async () => {
    const upcTaken = vi.fn().mockResolvedValue(false);
    const upc = await resolveIntakeCheckoutUpc('', upcTaken);
    expect(upc).toMatch(/^LIB[0-9A-F]{8}$/);
  });

  it('checkoutBarcodeSaveMessage distinguishes LIB vs book barcodes', () => {
    expect(usesLibCheckoutSticker('LIB00112233')).toBe(true);
    expect(usesLibCheckoutSticker('9781422631157')).toBe(false);
    expect(checkoutBarcodeSaveMessage('9781422631157')).toContain('no LIB sticker');
    expect(checkoutBarcodeSaveMessage('LIB00112233')).toContain('print a LIB sticker');
  });
});
