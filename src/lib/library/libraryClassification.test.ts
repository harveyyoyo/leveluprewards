import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LIBRARY_GENRES,
  DEFAULT_LIBRARY_PLACEMENT_ZONES,
  resolveBookClassification,
  generateGenreBarcode,
  extractGenreFromBarcode,
  getActiveLibraryGenres,
} from './libraryClassification';

describe('libraryClassification', () => {
  it('has at least 10 default curated genres with colors and shelf placements', () => {
    expect(DEFAULT_LIBRARY_GENRES.length).toBeGreaterThanOrEqual(10);
    for (const g of DEFAULT_LIBRARY_GENRES) {
      expect(g.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(g.callPrefix.length).toBeGreaterThanOrEqual(2);
      expect(g.defaultShelf.length).toBeGreaterThan(0);
    }
  });

  it('resolves standard genre classification with fuzzy matching', () => {
    const fic = resolveBookClassification('Fiction');
    expect(fic.genre.callPrefix).toBe('FIC');
    expect(fic.color).toBe('#2563EB');
    expect(fic.shelfLocation).toContain('Fiction');

    const sci = resolveBookClassification('Science');
    expect(sci.genre.callPrefix).toBe('SCI');
    expect(sci.color).toBe('#059669');

    const graphic = resolveBookClassification('Graphic Novel');
    expect(graphic.genre.callPrefix).toBe('GRA');
    expect(graphic.color).toBe('#EA580C');
  });

  it('falls back to general genre when category is unknown', () => {
    const fallback = resolveBookClassification('Some Random Category XYZ');
    expect(fallback.genre.id).toBe('general');
    expect(fallback.genre.callPrefix).toBe('GEN');
  });

  it('preserves existing custom shelfLocation when provided', () => {
    const resolved = resolveBookClassification('Science', null, 'Room 102 Custom Cart');
    expect(resolved.shelfLocation).toBe('Room 102 Custom Cart');
  });

  it('generates structured genre barcodes (FIC-823-0001)', () => {
    const code = generateGenreBarcode({
      category: 'Fiction',
      scheme: 'genre_code',
    });
    expect(code).toBe('FIC-823-0001');

    const sciCode = generateGenreBarcode({
      category: 'Science',
      scheme: 'genre_code',
    });
    expect(sciCode).toBe('SCI-500-0001');
  });

  it('increments sequence number based on existing barcodes', () => {
    const existing = ['FIC-823-0001', 'FIC-823-0002', 'FIC-823-0003'];
    const nextCode = generateGenreBarcode({
      category: 'Fiction',
      existingUpcs: existing,
      scheme: 'genre_code',
    });
    expect(nextCode).toBe('FIC-823-0004');
  });

  it('supports alternative numbering schemes (dewey_numeric & prefix_genre)', () => {
    const dewey = generateGenreBarcode({
      category: 'History',
      scheme: 'dewey_numeric',
    });
    expect(dewey).toBe('900-0001');

    const prefixed = generateGenreBarcode({
      category: 'Mystery',
      scheme: 'prefix_genre',
    });
    expect(prefixed).toBe('LIB-MYS-0001');
  });

  it('extracts genre from barcode', () => {
    const g1 = extractGenreFromBarcode('FIC-823-0042');
    expect(g1?.callPrefix).toBe('FIC');

    const g2 = extractGenreFromBarcode('LIB-SCI-0010');
    expect(g2?.callPrefix).toBe('SCI');

    const g3 = extractGenreFromBarcode('900-0015');
    expect(g3?.dewey).toBe('900');
  });

  it('allows custom genre overrides from settings', () => {
    const custom = [
      {
        id: 'coding_robotics',
        label: 'Coding & Robotics',
        color: '#10B981',
        callPrefix: 'COD',
        dewey: '005',
        defaultShelf: 'Makerspace Shelf 1',
      },
    ];
    const active = getActiveLibraryGenres(custom);
    expect(active).toHaveLength(1);
    expect(active[0].callPrefix).toBe('COD');

    const code = generateGenreBarcode({
      category: 'Coding & Robotics',
      customGenres: custom,
      scheme: 'genre_code',
    });
    expect(code).toBe('COD-005-0001');
  });
});
