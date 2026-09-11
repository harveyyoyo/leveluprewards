import type { LibraryItem } from '@/lib/types';

export interface BookRecommendation {
  id: string;
  name: string;
  author: string;
  category?: string;
  shelfLocation?: string;
  coverUrl?: string;
  reason: string;
  matchScore: number;
}

/**
 * Intelligent book recommendation generator for students.
 * Analyzes current catalog availability, matches student's reading categories,
 * and highlights popular or featured titles on the kiosk.
 */
export function getLibraryBookRecommendations(
  catalog: LibraryItem[],
  options?: {
    studentLoans?: LibraryItem[];
    pastCategories?: string[];
    currentStudentId?: string;
    limit?: number;
  },
): BookRecommendation[] {
  const maxResults = options?.limit ?? 5;
  const currentLoanIds = new Set((options?.studentLoans ?? []).map((l) => l.id));
  const currentLoanNames = new Set((options?.studentLoans ?? []).map((l) => l.name.trim().toLowerCase()));

  // Collect category preferences
  const preferredCategories = new Set(
    (options?.pastCategories ?? [])
      .concat((options?.studentLoans ?? []).map((l) => l.category || ''))
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean),
  );

  // Available copies only
  const availableItems = catalog.filter(
    (item) =>
      item.status === 'available' &&
      !item.archived &&
      !currentLoanIds.has(item.id) &&
      !currentLoanNames.has(item.name.trim().toLowerCase()) &&
      item.condition !== 'lost' &&
      item.condition !== 'damaged',
  );

  // Deduplicate by normalized title or ISBN to avoid recommending multiple copies of the same book
  const seenKeys = new Set<string>();
  const uniqueItems: LibraryItem[] = [];
  for (const item of availableItems) {
    const key = item.isbn?.trim()
      ? `isbn:${item.isbn.trim()}`
      : item.name
          .toLowerCase()
          .replace(/\s*\(.*?(copy|duplicate).*?\)/gi, '')
          .replace(/\s*copy\s*\d+/gi, '')
          .trim();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueItems.push(item);
    }
  }

  const recommendations: BookRecommendation[] = uniqueItems.map((item) => {
    let score = 10;
    let reason = 'Popular in School';

    const itemCategory = (item.category || '').trim().toLowerCase();
    if (itemCategory && preferredCategories.has(itemCategory)) {
      score += 50;
      reason = `More in ${item.category}`;
    } else if (item.shelfLocation) {
      score += 5;
      reason = 'Available on Shelf';
    }

    if (item.createdAt && Date.now() - item.createdAt < 30 * 24 * 60 * 60 * 1000) {
      score += 15;
      if (!preferredCategories.has(itemCategory)) {
        reason = 'New Arrival';
      }
    }

    return {
      id: item.id,
      name: item.name,
      author: item.author?.trim() || 'School Library',
      category: item.category?.trim(),
      shelfLocation: item.shelfLocation?.trim(),
      coverUrl: item.coverUrl,
      reason,
      matchScore: score,
    };
  });

  recommendations.sort((a, b) => b.matchScore - a.matchScore);
  return recommendations.slice(0, maxResults);
}
