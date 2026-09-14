import { describe, expect, it } from 'vitest';
import type { LibraryItem } from '@/lib/types';
import { getLibraryBookRecommendations } from './libraryRecommendations';

const mockCatalog: LibraryItem[] = [
  {
    id: 'book-1',
    name: 'The Hobbit',
    upc: 'UPC1',
    author: 'J.R.R. Tolkien',
    category: 'Fantasy',
    status: 'available',
    shelfLocation: 'F-TOL',
  },
  {
    id: 'book-2',
    name: 'Harry Potter',
    upc: 'UPC2',
    author: 'J.K. Rowling',
    category: 'Fantasy',
    status: 'available',
    shelfLocation: 'F-ROW',
  },
  {
    id: 'book-3',
    name: 'Cosmos',
    upc: 'UPC3',
    author: 'Carl Sagan',
    category: 'Science',
    status: 'available',
    shelfLocation: '520-SAG',
  },
  {
    id: 'book-4',
    name: 'Already Checked Out Copy',
    upc: 'UPC4',
    status: 'checked_out',
    author: 'Author',
  },
  {
    id: 'book-5',
    name: 'Archived Book',
    upc: 'UPC5',
    status: 'available',
    archived: true,
  },
  {
    id: 'book-6',
    name: 'Damaged Copy',
    upc: 'UPC6',
    status: 'available',
    condition: 'damaged',
  },
  {
    id: 'book-7',
    name: 'The Hobbit (Duplicate Copy)',
    upc: 'UPC7',
    author: 'J.R.R. Tolkien',
    category: 'Fantasy',
    status: 'available',
  },
];

describe('libraryRecommendations', () => {
  it('filters out unavailable, archived, and damaged copies', () => {
    const recs = getLibraryBookRecommendations(mockCatalog);
    const ids = recs.map((r) => r.id);
    expect(ids).not.toContain('book-4');
    expect(ids).not.toContain('book-5');
    expect(ids).not.toContain('book-6');
  });

  it('deduplicates duplicate titles in recommendations', () => {
    const recs = getLibraryBookRecommendations(mockCatalog);
    const hobbitCount = recs.filter((r) => r.name.toLowerCase().includes('the hobbit')).length;
    expect(hobbitCount).toBe(1);
  });

  it('boosts books matching preferred categories', () => {
    const recs = getLibraryBookRecommendations(mockCatalog, {
      pastCategories: ['science'],
    });
    expect(recs[0].name).toBe('Cosmos');
    expect(recs[0].reason).toContain('Science');
  });

  it('does not recommend books the student currently has on loan', () => {
    const recs = getLibraryBookRecommendations(mockCatalog, {
      studentLoans: [mockCatalog[0]], // The Hobbit
    });
    const names = recs.map((r) => r.name);
    expect(names).not.toContain('The Hobbit');
  });

  it('boosts another book by an author the student rated highly', () => {
    const catalog = [
      ...mockCatalog,
      {
        id: 'book-8',
        name: 'The Two Towers',
        upc: 'UPC8',
        author: 'J.R.R. Tolkien',
        category: 'Fantasy',
        status: 'available' as const,
      },
    ];
    const recs = getLibraryBookRecommendations(catalog, {
      reviews: [{ itemId: 'book-1', rating: 5, bookTitle: 'The Hobbit' }],
    });
    expect(recs[0].name).toBe('The Two Towers');
    expect(recs[0].reason).toContain('Tolkien');
  });

  it('does not recommend a title the student already rated', () => {
    const recs = getLibraryBookRecommendations(mockCatalog, {
      reviews: [{ itemId: 'book-2', rating: 5, bookTitle: 'Harry Potter' }],
    });
    expect(recs.map((r) => r.name)).not.toContain('Harry Potter');
  });

  it('does not treat unread returns as a liked category', () => {
    const recs = getLibraryBookRecommendations(mockCatalog, {
      reviews: [{ itemId: 'book-3', rating: 0, bookTitle: 'Cosmos', didNotRead: true }],
    });
    expect(recs[0]?.name).not.toBe('Cosmos');
    expect(recs[0]?.reason ?? '').not.toContain('Science');
  });

  it('boosts books in a category the student liked', () => {
    const catalog = [
      ...mockCatalog,
      {
        id: 'book-9',
        name: 'A Brief History of Time',
        upc: 'UPC9',
        author: 'Stephen Hawking',
        category: 'Science',
        status: 'available' as const,
      },
    ];
    const recs = getLibraryBookRecommendations(catalog, {
      reviews: [{ itemId: 'book-3', rating: 5, bookTitle: 'Cosmos' }],
    });
    expect(recs[0].name).toBe('A Brief History of Time');
    expect(recs[0].reason).toContain('Science');
  });
});
