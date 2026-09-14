import { describe, expect, it } from 'vitest';
import {
  libraryCatalogPageSize,
  libraryPileGridClass,
  libraryTitleGridClass,
  parseLibraryCoverSize,
} from './libraryCatalogView';

describe('libraryCatalogView', () => {
  it('defaults unknown cover sizes to small', () => {
    expect(parseLibraryCoverSize(null)).toBe('small');
    expect(parseLibraryCoverSize('huge')).toBe('small');
    expect(parseLibraryCoverSize('lots')).toBe('small');
    expect(parseLibraryCoverSize('big')).toBe('large');
  });

  it('shows fewer titles per page when covers are larger', () => {
    expect(libraryCatalogPageSize('grid', 'large')).toBeLessThan(libraryCatalogPageSize('grid', 'medium'));
    expect(libraryCatalogPageSize('grid', 'small')).toBeGreaterThan(libraryCatalogPageSize('grid', 'medium'));
    expect(libraryCatalogPageSize('list', 'small')).toBe(36);
  });

  it('uses fewer columns for larger covers', () => {
    expect(libraryTitleGridClass('large')).toContain('lg:grid-cols-3');
    expect(libraryTitleGridClass('small')).toContain('xl:grid-cols-8');
    expect(libraryPileGridClass('medium')).toContain('lg:grid-cols-6');
  });
});
