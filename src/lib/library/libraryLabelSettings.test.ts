import { describe, expect, it } from 'vitest';
import {
  enabledLibraryLabelFormats,
  enabledLibraryLabelOptions,
  libraryLabelShows,
  resolveDefaultLibraryLabelFormat,
  resolveLibraryLabelFields,
} from './libraryLabelSettings';

describe('library label settings', () => {
  it('treats a missing list as every sticker type', () => {
    expect(enabledLibraryLabelFormats(undefined)).toHaveLength(6);
    expect(enabledLibraryLabelOptions(null).map((option) => option.id)).toContain('sticker');
  });

  it('keeps only known sticker types, in the usual order', () => {
    expect(enabledLibraryLabelFormats(['pocket', 'sticker', 'mystery' as 'sticker'])).toEqual([
      'sticker',
      'pocket',
    ]);
  });

  it('falls back when the saved default is turned off', () => {
    expect(resolveDefaultLibraryLabelFormat('thermal', ['spine', 'pocket'])).toBe('spine');
    expect(resolveDefaultLibraryLabelFormat('spine', ['spine', 'pocket'])).toBe('spine');
  });

  it('shows every piece unless a setting turns it off', () => {
    expect(libraryLabelShows(undefined, 'title')).toBe(true);
    expect(libraryLabelShows({ title: false }, 'title')).toBe(false);
    expect(resolveLibraryLabelFields({ author: false }).author).toBe(false);
    expect(resolveLibraryLabelFields({ author: false }).title).toBe(true);
  });
});
