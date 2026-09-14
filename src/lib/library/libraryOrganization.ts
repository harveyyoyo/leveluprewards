import type { LibraryItem } from '@/lib/types';
import {
  DEFAULT_LIBRARY_GENRES,
  DEFAULT_LIBRARY_PLACEMENT_ZONES,
  resolveBookClassification,
  type LibraryGenreConfig,
} from './libraryClassification';

export type LibraryOrganizationScheme =
  | 'genre_then_author'
  | 'author_then_title';

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
      'Books are lined up by kind (Fiction, Science, History…), then by the author’s last name.',
    example: 'Fiction → [C] Canin, Ethan',
  },
  author_then_title: {
    id: 'author_then_title',
    label: 'Author (A–Z), then by Title',
    shortLabel: 'Author → Title',
    description:
      'Books are lined up by the author’s last name, then by title A–Z for that author.',
    example: '[C] Canin, Ethan → A Doubter’s Almanac',
  },
};

/** Map old saved choices onto the two lineup options. */
export function resolveLibraryOrganizationScheme(value: unknown): LibraryOrganizationScheme {
  if (value === 'author_then_title' || value === 'author_then_genre') return 'author_then_title';
  return 'genre_then_author';
}

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
  scheme: LibraryOrganizationScheme | string | null | undefined = 'genre_then_author',
  customGenres?: LibraryGenreConfig[] | null,
): BookPrimaryGroup[] {
  const resolved = resolveLibraryOrganizationScheme(scheme);

  if (resolved === 'genre_then_author') {
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

  const authorMap = new Map<string, Map<string, LibraryItem[]>>();

  for (const item of items) {
    const { filingName } = formatAuthorForFiling(item.author);
    let titleMap = authorMap.get(filingName);
    if (!titleMap) {
      titleMap = new Map();
      authorMap.set(filingName, titleMap);
    }
    const title = (item.name || 'Untitled').trim() || 'Untitled';
    const list = titleMap.get(title) ?? [];
    list.push(item);
    titleMap.set(title, list);
  }

  const groups: BookPrimaryGroup[] = [];
  const sortedAuthors = Array.from(authorMap.keys()).sort((a, b) => a.localeCompare(b));

  for (const author of sortedAuthors) {
    const titleMap = authorMap.get(author)!;
    const subGroups: BookSubGroup[] = [];
    let total = 0;

    const sortedTitles = Array.from(titleMap.keys()).sort((a, b) => a.localeCompare(b));
    for (const title of sortedTitles) {
      const books = titleMap.get(title) ?? [];
      total += books.length;
      books.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      subGroups.push({
        subKey: `${author}::${title}`,
        subLabel: title,
        badgeText: `${books.length} ${books.length === 1 ? 'copy' : 'copies'}`,
        books,
      });
    }

    groups.push({
      key: author,
      label: author,
      secondaryLabel: `${subGroups.length} ${subGroups.length === 1 ? 'title' : 'titles'}`,
      badgeText: author.charAt(0).toUpperCase(),
      totalCopies: total,
      subGroups,
    });
  }

  return groups;
}
