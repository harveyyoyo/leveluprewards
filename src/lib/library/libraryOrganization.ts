import type { LibraryItem } from '@/lib/types';
import {
  DEFAULT_LIBRARY_GENRES,
  DEFAULT_LIBRARY_PLACEMENT_ZONES,
  resolveBookClassification,
  type LibraryGenreConfig,
} from './libraryClassification';

export type LibraryOrganizationScheme =
  | 'genre_then_author'
  | 'author_then_genre'
  | 'shelf_then_author';

export interface SchemeMeta {
  id: LibraryOrganizationScheme;
  label: string;
  shortLabel: string;
  description: string;
  example: string;
}

export const LIBRARY_ORGANIZATION_SCHEMES: Record<LibraryOrganizationScheme, SchemeMeta> = {
  genre_then_author: {
    id: 'genre_then_author',
    label: 'Genre, then by Author (A–Z)',
    shortLabel: 'Genre → Author',
    description:
      'Books are shelved in Genre sections (Fiction, Science, History…), and alphabetized by Author’s last name within each section.',
    example: 'Fiction Bay → [C] Canin, Ethan',
  },
  author_then_genre: {
    id: 'author_then_genre',
    label: 'Author (A–Z), then by Genre',
    shortLabel: 'Author → Genre',
    description:
      'Books are alphabetized primarily by Author (A-Z). Within each author’s section, books are grouped by Genre.',
    example: '[C] Canin, Ethan → Fiction',
  },
  shelf_then_author: {
    id: 'shelf_then_author',
    label: 'Where in Library (Shelf / Location), then Author',
    shortLabel: 'Shelf → Author',
    description:
      'Books are organized by their physical room and shelf placement in the library, then by Author.',
    example: 'Aisle 1 - Fiction Bays → [C] Canin, Ethan',
  },
};

/**
 * Split and format author name into "Last, First" for library shelf sorting.
 * e.g. "Ethan Canin" -> "Canin, Ethan", "J.K. Rowling" -> "Rowling, J.K."
 */
export function formatAuthorForFiling(author?: string | null): { filingName: string; letter: string } {
  const raw = (author ?? '').trim();
  if (!raw) return { filingName: 'Unknown Author', letter: '#' };

  // If already contains a comma (e.g. "Canin, Ethan")
  if (raw.includes(',')) {
    const letter = raw.charAt(0).toUpperCase();
    return { filingName: raw, letter: /[A-Z]/.test(letter) ? letter : '#' };
  }

  const parts = raw.split(/\s+/);
  if (parts.length === 1) {
    const letter = parts[0].charAt(0).toUpperCase();
    return { filingName: parts[0], letter: /[A-Z]/.test(letter) ? letter : '#' };
  }

  const lastName = parts[parts.length - 1];
  const firstNames = parts.slice(0, parts.length - 1).join(' ');
  const filingName = `${lastName}, ${firstNames}`;
  const letter = lastName.charAt(0).toUpperCase();
  return { filingName, letter: /[A-Z]/.test(letter) ? letter : '#' };
}

/**
 * Resolve where in the physical library a book is located.
 */
export function resolveBookPhysicalLocation(
  item: Partial<LibraryItem>,
  customGenres?: LibraryGenreConfig[] | null,
): {
  shelfLocation: string;
  genre: LibraryGenreConfig;
  filingName: string;
  letter: string;
  directionalGuide: string;
} {
  const classification = resolveBookClassification(item.category, customGenres, item.shelfLocation);
  const shelf = (item.shelfLocation ?? '').trim() || classification.shelfLocation || 'Main Stacks';
  const { filingName, letter } = formatAuthorForFiling(item.author);

  const directionalGuide = `${shelf} · [${classification.genre.callPrefix}] · File under ${letter} (${filingName})`;

  return {
    shelfLocation: shelf,
    genre: classification.genre,
    filingName,
    letter,
    directionalGuide,
  };
}

export interface BookSubGroup {
  subKey: string;
  subLabel: string;
  badgeText?: string;
  color?: string;
  books: LibraryItem[];
}

export interface BookPrimaryGroup {
  key: string;
  label: string;
  secondaryLabel?: string;
  badgeText?: string;
  color?: string;
  shelfLocation?: string;
  totalCopies: number;
  subGroups: BookSubGroup[];
}

/**
 * Group a catalog list by the chosen organization scheme.
 */
export function groupBooksByOrganizationScheme(
  items: LibraryItem[],
  scheme: LibraryOrganizationScheme = 'genre_then_author',
  customGenres?: LibraryGenreConfig[] | null,
): BookPrimaryGroup[] {
  if (scheme === 'genre_then_author') {
    // Top Level: Genre -> Sub Level: Author
    const genreMap = new Map<string, { genre: LibraryGenreConfig; authorMap: Map<string, LibraryItem[]> }>();

    for (const item of items) {
      const classification = resolveBookClassification(item.category, customGenres, item.shelfLocation);
      const genre = classification.genre;
      let entry = genreMap.get(genre.id);
      if (!entry) {
        entry = { genre, authorMap: new Map() };
        genreMap.set(genre.id, entry);
      }
      const { filingName } = formatAuthorForFiling(item.author);
      const existing = entry.authorMap.get(filingName) ?? [];
      existing.push(item);
      entry.authorMap.set(filingName, existing);
    }

    const groups: BookPrimaryGroup[] = [];
    for (const [, { genre, authorMap }] of genreMap.entries()) {
      const subGroups: BookSubGroup[] = [];
      let total = 0;

      // Sort authors alphabetically
      const sortedAuthors = Array.from(authorMap.keys()).sort((a, b) => a.localeCompare(b));
      for (const author of sortedAuthors) {
        const books = authorMap.get(author) ?? [];
        total += books.length;
        // Sort books by title
        books.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        subGroups.push({
          subKey: author,
          subLabel: author,
          badgeText: `${books.length} ${books.length === 1 ? 'book' : 'books'}`,
          books,
        });
      }

      groups.push({
        key: genre.id,
        label: genre.label,
        secondaryLabel: genre.defaultShelf,
        badgeText: genre.callPrefix,
        color: genre.color,
        shelfLocation: genre.defaultShelf,
        totalCopies: total,
        subGroups,
      });
    }

    return groups.sort((a, b) => a.label.localeCompare(b.label));
  }

  if (scheme === 'author_then_genre') {
    // Top Level: Author -> Sub Level: Genre
    const authorMap = new Map<string, { filingName: string; genreMap: Map<string, { genre: LibraryGenreConfig; books: LibraryItem[] }> }>();

    for (const item of items) {
      const { filingName } = formatAuthorForFiling(item.author);
      let entry = authorMap.get(filingName);
      if (!entry) {
        entry = { filingName, genreMap: new Map() };
        authorMap.set(filingName, entry);
      }

      const classification = resolveBookClassification(item.category, customGenres, item.shelfLocation);
      const g = classification.genre;
      let gEntry = entry.genreMap.get(g.id);
      if (!gEntry) {
        gEntry = { genre: g, books: [] };
        entry.genreMap.set(g.id, gEntry);
      }
      gEntry.books.push(item);
    }

    const groups: BookPrimaryGroup[] = [];
    const sortedAuthors = Array.from(authorMap.keys()).sort((a, b) => a.localeCompare(b));

    for (const author of sortedAuthors) {
      const { genreMap } = authorMap.get(author)!;
      const subGroups: BookSubGroup[] = [];
      let total = 0;

      for (const [, { genre, books }] of genreMap.entries()) {
        total += books.length;
        books.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        subGroups.push({
          subKey: genre.id,
          subLabel: genre.label,
          badgeText: genre.callPrefix,
          color: genre.color,
          books,
        });
      }

      // Sort sub-genres by label
      subGroups.sort((a, b) => a.subLabel.localeCompare(b.subLabel));

      groups.push({
        key: author,
        label: author,
        secondaryLabel: `${subGroups.length} ${subGroups.length === 1 ? 'genre' : 'genres'}`,
        badgeText: author.charAt(0).toUpperCase(),
        totalCopies: total,
        subGroups,
      });
    }

    return groups;
  }

  // shelf_then_author
  const shelfMap = new Map<string, Map<string, LibraryItem[]>>();

  for (const item of items) {
    const loc = resolveBookPhysicalLocation(item, customGenres);
    const shelf = loc.shelfLocation;
    let aMap = shelfMap.get(shelf);
    if (!aMap) {
      aMap = new Map();
      shelfMap.set(shelf, aMap);
    }
    const { filingName } = loc;
    const list = aMap.get(filingName) ?? [];
    list.push(item);
    aMap.set(filingName, list);
  }

  const groups: BookPrimaryGroup[] = [];
  const sortedShelves = Array.from(shelfMap.keys()).sort((a, b) => a.localeCompare(b));

  for (const shelf of sortedShelves) {
    const aMap = shelfMap.get(shelf)!;
    const subGroups: BookSubGroup[] = [];
    let total = 0;

    const sortedAuthors = Array.from(aMap.keys()).sort((a, b) => a.localeCompare(b));
    for (const author of sortedAuthors) {
      const books = aMap.get(author) ?? [];
      total += books.length;
      books.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      subGroups.push({
        subKey: author,
        subLabel: author,
        badgeText: `${books.length} copies`,
        books,
      });
    }

    groups.push({
      key: shelf,
      label: shelf,
      secondaryLabel: `${subGroups.length} authors`,
      badgeText: 'Shelf',
      shelfLocation: shelf,
      totalCopies: total,
      subGroups,
    });
  }

  return groups;
}
