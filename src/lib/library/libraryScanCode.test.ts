import { describe, it, expect } from 'vitest';
import {
  LIBRARY_LABEL_OPTIONS,
  getLibraryLabelOption,
  libraryBarcodeForPrint,
  normalizeLibraryUpc,
  isSchoolLibraryBarcode,
  generateLibraryBarcode,
  type LibraryLabelFormat,
} from './libraryScanCode';

describe('libraryScanCode and label formats', () => {
  it('defines all 6 standard library label formats with complete layout metadata', () => {
    const expectedFormats: LibraryLabelFormat[] = [
      'sticker',
      'spine',
      'spine_square',
      'large_plate',
      'thermal',
      'pocket',
    ];

    expect(LIBRARY_LABEL_OPTIONS).toHaveLength(6);

    for (const format of expectedFormats) {
      const opt = getLibraryLabelOption(format);
      expect(opt.id).toBe(format);
      expect(opt.name).toBeTruthy();
      expect(opt.shortName).toBeTruthy();
      expect(opt.dimensions).toBeTruthy();
      expect(opt.sheetType).toBeTruthy();
      expect(opt.itemsPerPage).toBeGreaterThan(0);
      expect(opt.badge).toBeTruthy();
      expect(opt.description).toBeTruthy();
    }
  });

  it('correctly maps specific sheet capacities and roll dimensions', () => {
    // Avery 5160: 30 per sheet
    expect(getLibraryLabelOption('sticker').itemsPerPage).toBe(30);

    // Avery 5167: 80 per sheet
    expect(getLibraryLabelOption('spine').itemsPerPage).toBe(80);

    // Square Spine: 30 per sheet
    expect(getLibraryLabelOption('spine_square').itemsPerPage).toBe(30);

    // Avery 5163: 10 per sheet
    expect(getLibraryLabelOption('large_plate').itemsPerPage).toBe(10);

    // Thermal roll: 1 per page / continuous
    expect(getLibraryLabelOption('thermal').itemsPerPage).toBe(1);

    // Circulation pocket: 4 per sheet
    expect(getLibraryLabelOption('pocket').itemsPerPage).toBe(4);
  });

  it('falls back to standard sticker if unknown format is requested', () => {
    // @ts-expect-error testing invalid format fallback
    const opt = getLibraryLabelOption('unknown_format');
    expect(opt.id).toBe('sticker');
  });

  it('normalizes and validates library barcodes', () => {
    expect(normalizeLibraryUpc('  lib123abc  ')).toBe('LIB123ABC');
    expect(libraryBarcodeForPrint({ upc: 'lib987 ' })).toBe('LIB987');

    const generated = generateLibraryBarcode();
    expect(generated.startsWith('LIB')).toBe(true);
    expect(isSchoolLibraryBarcode(generated)).toBe(true);
    expect(isSchoolLibraryBarcode('9780545010221')).toBe(false);
  });
});
