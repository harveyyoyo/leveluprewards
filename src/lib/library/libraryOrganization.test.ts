import { describe, expect, it } from 'vitest';
import {
  LIBRARY_ORGANIZATION_SCHEMES,
  groupBooksByOrganizationScheme,
  resolveLibraryOrganizationScheme,
} from './libraryOrganization';
import type { LibraryItem } from '@/lib/types';

function book(partial: Partial<LibraryItem> & Pick<LibraryItem, 'id' | 'name' | 'author'>): LibraryItem {
  return {
    upc: partial.id,
    status: 'available',
    ...partial,
  } as LibraryItem;
}

describe('libraryOrganization', () => {
  it('supports genre-then-author, author-then-title, and reading-level lineup choices', () => {
    expect(Object.keys(LIBRARY_ORGANIZATION_SCHEMES)).toEqual([
      'genre_then_author',
      'author_then_title',
      'reading_level_then_author',
    ]);
    expect(LIBRARY_ORGANIZATION_SCHEMES.genre_then_author.label).toBe('Genre, then by Author (A–Z)');
    expect(LIBRARY_ORGANIZATION_SCHEMES.author_then_title.label).toBe('Author (A–Z), then by Title');
    expect(LIBRARY_ORGANIZATION_SCHEMES.reading_level_then_author.label).toBe('Reading Level, then by Author (A–Z)');
  });

  it('maps saved lineup choices onto the options', () => {
    expect(resolveLibraryOrganizationScheme(undefined)).toBe('genre_then_author');
    expect(resolveLibraryOrganizationScheme('shelf_then_author')).toBe('genre_then_author');
    expect(resolveLibraryOrganizationScheme('author_then_genre')).toBe('author_then_title');
    expect(resolveLibraryOrganizationScheme('reading_level')).toBe('reading_level_then_author');
    expect(resolveLibraryOrganizationScheme('reading_level_then_author')).toBe('reading_level_then_author');
  });

  it('groups author-then-title by author, then title A–Z', () => {
    const groups = groupBooksByOrganizationScheme(
      [
        book({ id: '1', name: 'Zebra Tales', author: 'Ethan Canin' }),
        book({ id: '2', name: 'A Doubter’s Almanac', author: 'Ethan Canin' }),
        book({ id: '3', name: 'Hoot', author: 'Carl Hiaasen' }),
      ],
      'author_then_title',
    );
    expect(groups.map((group) => group.label)).toEqual(['Canin, Ethan', 'Hiaasen, Carl']);
    expect(groups[0]?.subGroups.map((sub) => sub.subLabel)).toEqual(['A Doubter’s Almanac', 'Zebra Tales']);
  });

  it('groups reading-level-then-author by level, then author A–Z', () => {
    const groups = groupBooksByOrganizationScheme(
      [
        book({ id: '1', name: 'Matilda', author: 'Roald Dahl', readingLevel: 'N' }),
        book({ id: '2', name: 'Charlie and the Chocolate Factory', author: 'Roald Dahl', readingLevel: 'M' }),
        book({ id: '3', name: 'Charlotte’s Web', author: 'E.B. White', readingLevel: 'M' }),
        book({ id: '4', name: 'Mystery Story', author: 'Unknown Author' }),
      ],
      'reading_level_then_author',
    );

    expect(groups.map((group) => group.label)).toEqual([
      'Reading Level M',
      'Reading Level N',
      'General / Unleveled',
    ]);
    const groupM = groups[0];
    expect(groupM?.subGroups.map((sub) => sub.subLabel)).toEqual(['Dahl, Roald', 'White, E.B.']);
  });
});
