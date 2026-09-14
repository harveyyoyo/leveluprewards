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
  it('keeps only genre-then-author and author-then-title lineup choices', () => {
    expect(Object.keys(LIBRARY_ORGANIZATION_SCHEMES)).toEqual(['genre_then_author', 'author_then_title']);
    expect(LIBRARY_ORGANIZATION_SCHEMES.genre_then_author.label).toBe('Genre, then by Author (A–Z)');
    expect(LIBRARY_ORGANIZATION_SCHEMES.author_then_title.label).toBe('Author (A–Z), then by Title');
  });

  it('maps old saved lineup choices onto the two options', () => {
    expect(resolveLibraryOrganizationScheme(undefined)).toBe('genre_then_author');
    expect(resolveLibraryOrganizationScheme('shelf_then_author')).toBe('genre_then_author');
    expect(resolveLibraryOrganizationScheme('author_then_genre')).toBe('author_then_title');
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
});
