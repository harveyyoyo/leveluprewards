import { LibraryItem } from '../types';

export interface BookPile {
  pileKey: string;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  shelfLocation?: string;
  category?: string;
  readingLevel?: string;
  ratingAvg?: number;
  publishedYear?: string;
  copies: LibraryItem[];
  hasMultipleCopies: boolean;
  availableCount: number;
  loanCount: number;
  lostDamagedCount: number;
}

/**
 * Derives a deterministic grouping key for a book title so that
 * identical editions and title copies are grouped into the same pile.
 */
export function getBookPileKey(item: LibraryItem): string {
  if (item.isbn && item.isbn.trim()) {
    return `isbn:${item.isbn.trim().toLowerCase()}`;
  }
  const normTitle = (item.name || '').trim().toLowerCase();
  const normAuthor = (item.author || '').trim().toLowerCase();
  return `title:${normTitle}:::author:${normAuthor}`;
}

/**
 * Groups an array of LibraryItems into BookPiles.
 * Books sharing the same ISBN or normalized title + author are clustered together.
 * Preserves the original order based on the first occurrence of each book.
 */
export function groupBooksIntoPiles(items: LibraryItem[]): BookPile[] {
  const map = new Map<string, BookPile>();
  const pileOrder: string[] = [];

  for (const item of items) {
    const key = getBookPileKey(item);
    let pile = map.get(key);
    if (!pile) {
      pile = {
        pileKey: key,
        title: item.name || 'Untitled Book',
        author: item.author || '',
        isbn: item.isbn,
        coverUrl: item.coverUrl,
        shelfLocation: item.shelfLocation,
        category: item.category,
        readingLevel: item.readingLevel,
        ratingAvg: item.ratingAvg,
        publishedYear: item.publishedYear,
        copies: [],
        hasMultipleCopies: false,
        availableCount: 0,
        loanCount: 0,
        lostDamagedCount: 0,
      };
      map.set(key, pile);
      pileOrder.push(key);
    }

    // Enhance pile metadata from copy if not yet populated
    if (!pile.coverUrl && item.coverUrl) pile.coverUrl = item.coverUrl;
    if (!pile.isbn && item.isbn) pile.isbn = item.isbn;
    if (!pile.shelfLocation && item.shelfLocation) pile.shelfLocation = item.shelfLocation;
    if (!pile.readingLevel && item.readingLevel) pile.readingLevel = item.readingLevel;

    pile.copies.push(item);
    if (item.condition === 'lost' || item.condition === 'damaged') {
      pile.lostDamagedCount++;
    } else if (item.status === 'checked_out') {
      pile.loanCount++;
    } else {
      pile.availableCount++;
    }
  }

  for (const pile of map.values()) {
    pile.hasMultipleCopies = pile.copies.length > 1;
  }

  return pileOrder.map((key) => map.get(key)!);
}
