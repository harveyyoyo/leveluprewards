import { describe, expect, it } from 'vitest';
import {
  getIsbnLookupVariants,
  isbn10ToIsbn13,
  isbn13ToIsbn10,
  isRetailIsbnBarcode,
  normalizeIsbnDigits,
} from './libraryCatalogLookup';

describe('libraryCatalogLookup', () => {
  it('normalizes non-digits', () => {
    expect(normalizeIsbnDigits('978-0-14-312774-1')).toBe('9780143127741');
  });

  it('builds ISBN-10 and ISBN-13 variants from ISBN-13', () => {
    const variants = getIsbnLookupVariants('9780143127741');
    expect(variants).toContain('9780143127741');
    expect(variants).toContain('0143127741');
  });

  it('accepts 12-digit bookland without check digit', () => {
    expect(isRetailIsbnBarcode('978014312774')).toBe(true);
    expect(getIsbnLookupVariants('978014312774')).toContain('9780143127741');
  });

  it('converts ISBN-13 to ISBN-10', () => {
    expect(isbn13ToIsbn10('9780143127741')).toBe('0143127741');
  });

  it('converts ISBN-10 to ISBN-13', () => {
    expect(isbn10ToIsbn13('0143127741')).toBe('9780143127741');
  });
});
