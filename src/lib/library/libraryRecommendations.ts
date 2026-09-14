import type { LibraryItem } from '@/lib/types';
import { isUnreadLibraryReview } from './libraryStudentRating';

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

export type StudentBookRating = {
  itemId: string;
  rating: number;
  bookTitle?: string;
  didNotRead?: boolean;
  reviewText?: string;
};

function titleKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?(copy|duplicate).*?\)/gi, '')
    .replace(/\s*copy\s*\d+/gi, '')
    .trim();
}

/**
 * Picks books for a student from what is on the shelf now.
 * Uses ratings, books they already read, and current loans so the reasons
 * can say things like "You liked another book by …".
 */
export function getLibraryBookRecommendations(
  catalog: LibraryItem[],
  options?: {
    studentLoans?: LibraryItem[];
    pastCategories?: string[];
    currentStudentId?: string;
    reviews?: StudentBookRating[];
    readItems?: LibraryItem[];
    limit?: number;
  },
): BookRecommendation[] {
  const maxResults = options?.limit ?? 5;
  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  const currentLoanIds = new Set((options?.studentLoans ?? []).map((l) => l.id));
  const tasteReviews = (options?.reviews ?? []).filter((review) => !isUnreadLibraryReview(review));
  const skipTitles = new Set(
    [
      ...(options?.studentLoans ?? []).map((l) => titleKey(l.name)),
      ...tasteReviews.map((review) => titleKey(review.bookTitle || catalogById.get(review.itemId)?.name || '')),
      ...(options?.readItems ?? []).map((item) => titleKey(item.name)),
    ].filter(Boolean),
  );
  const skipItemIds = new Set([
    ...currentLoanIds,
    ...tasteReviews.map((review) => review.itemId),
  ]);

  const likedReviews = tasteReviews.filter((review) => review.rating >= 4);
  const dislikedReviews = tasteReviews.filter((review) => review.rating <= 2);
  const likedItems = likedReviews
    .map((review) => catalogById.get(review.itemId))
    .filter((item): item is LibraryItem => Boolean(item));
  const dislikedItems = dislikedReviews
    .map((review) => catalogById.get(review.itemId))
    .filter((item): item is LibraryItem => Boolean(item));
  const historyItems = [...likedItems, ...(options?.readItems ?? []), ...(options?.studentLoans ?? [])];

  const preferredCategories = new Set(
    (options?.pastCategories ?? [])
      .concat(historyItems.map((item) => item.category || ''))
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean),
  );
  const likedAuthors = new Set(
    likedItems
      .map((item) => item.author?.trim().toLowerCase())
      .filter((author): author is string => Boolean(author)),
  );
  const likedCategories = new Set(
    likedItems
      .map((item) => item.category?.trim().toLowerCase())
      .filter((category): category is string => Boolean(category)),
  );
  const askedForCategories = new Set(
    (options?.pastCategories ?? []).map((category) => category.trim().toLowerCase()).filter(Boolean),
  );
  const likedSeries = new Set(
    likedItems
      .map((item) => item.series?.trim().toLowerCase())
      .filter((series): series is string => Boolean(series)),
  );
  const dislikedCategories = new Set(
    dislikedItems
      .map((item) => item.category?.trim().toLowerCase())
      .filter((category): category is string => Boolean(category)),
  );

  const availableItems = catalog.filter(
    (item) =>
      item.status === 'available' &&
      !item.archived &&
      !skipItemIds.has(item.id) &&
      !skipTitles.has(titleKey(item.name)) &&
      item.condition !== 'lost' &&
      item.condition !== 'damaged',
  );

  const seenKeys = new Set<string>();
  const uniqueItems: LibraryItem[] = [];
  for (const item of availableItems) {
    const key = item.isbn?.trim() ? `isbn:${item.isbn.trim()}` : titleKey(item.name);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueItems.push(item);
    }
  }

  const recommendations: BookRecommendation[] = uniqueItems.map((item) => {
    let score = 10;
    let reason = 'A good next book to try';

    const itemCategory = (item.category || '').trim().toLowerCase();
    const itemAuthor = item.author?.trim().toLowerCase() || '';
    const itemSeries = item.series?.trim().toLowerCase() || '';

    if (itemSeries && likedSeries.has(itemSeries)) {
      score += 80;
      reason = `More from a series you liked`;
    } else if (itemAuthor && likedAuthors.has(itemAuthor)) {
      score += 70;
      reason = `You liked another book by ${item.author}`;
    } else if (itemCategory && preferredCategories.has(itemCategory)) {
      score += likedCategories.has(itemCategory) ? 55 : 50;
      reason =
        likedCategories.has(itemCategory) || askedForCategories.has(itemCategory)
          ? `Because you liked ${item.category}`
          : `Because you read ${item.category}`;
    } else if (item.shelfLocation) {
      score += 5;
      reason = 'Ready on the shelf';
    }

    if (itemCategory && dislikedCategories.has(itemCategory) && !likedAuthors.has(itemAuthor)) {
      score -= 25;
    }

    if (item.createdAt && Date.now() - item.createdAt < 30 * 24 * 60 * 60 * 1000) {
      score += 15;
      if (!preferredCategories.has(itemCategory) && !likedAuthors.has(itemAuthor)) {
        reason = 'New on the shelf';
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
