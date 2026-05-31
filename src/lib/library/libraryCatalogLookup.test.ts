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
    expect(variants.some((v) => v.length === 10)).toBe(true);
  });

  it('accepts 12-digit bookland without check digit', () => {
    expect(isRetailIsbnBarcode('978014312774')).toBe(true);
    expect(getIsbnLookupVariants('978014312774')).toContain('9780143127741');
  });

  it('round-trips ISBN-10 through ISBN-13 when possible', () => {
    const thirteen = isbn10ToIsbn13('0439139600');
    expect(thirteen).toBe('9780439139601');
    if (thirteen) {
      const ten = isbn13ToIsbn10(thirteen);
      expect(ten).toBe('0439139600');
    }
  });
});
