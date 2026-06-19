import type { Category } from '@/lib/types';

/** Match award description (category name) to a configured category row. */
export function findCategoryByAwardDescription(
  description: string,
  categories: Category[],
): Category | undefined {
  const trimmed = description.trim();
  if (!trimmed) return undefined;
  return categories.find((c) => c.name === trimmed);
}

/**
 * Whether a student point award/deduction should also move the student's house totals.
 * Defaults to true when the category is unknown or the flag is unset (backward compatible).
 */
export function shouldRollupCategoryToHouse(
  description: string,
  categories: Category[],
): boolean {
  const cat = findCategoryByAwardDescription(description, categories);
  if (!cat) return true;
  return cat.countsForHousePoints !== false;
}

export function isGoldenTicketCategory(category: Category | undefined): boolean {
  return category?.isGoldenTicket === true;
}
