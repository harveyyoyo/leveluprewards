import { displayCategoryKey } from '@/lib/classroom/classroomRewardCategories';

type CategoryTotals = Record<string, number> | undefined | null;

type StudentCategoryFields = {
  categoryPoints?: CategoryTotals;
  categoryPointsByPeriod?: Record<string, CategoryTotals> | null;
};

/** Sum every key for this category: the plain name plus teacher-scoped classroom keys with the same label. */
function sumForCategory(totals: CategoryTotals, categoryName: string): number {
  if (!totals) return 0;
  const want = categoryName.trim();
  let sum = 0;
  for (const [key, value] of Object.entries(totals)) {
    if (typeof value !== 'number' || value <= 0) continue;
    if (displayCategoryKey(key) === want) sum += value;
  }
  return sum;
}

/**
 * Points a student has *earned* in a category, all time. Goals count earning, so spending must
 * never lower progress: `categoryPoints` is a spendable balance (category-restricted prizes take
 * from it), while the all-time period total only ever grows. Older students may predate the
 * period totals, so the larger of the two is used.
 */
export function earnedInCategory(student: StudentCategoryFields, categoryName: string): number {
  const allTime = student.categoryPointsByPeriod?.all ?? null;
  return Math.max(sumForCategory(allTime, categoryName), sumForCategory(student.categoryPoints, categoryName));
}

/**
 * Whether a student activity entry counts toward a category, for goals with dates. Awards and
 * classroom points use the category name as the description; coupon redemptions record
 * "Redeemed coupon: CODE (Category)".
 */
export function activityCountsForCategory(desc: unknown, categoryName: string): boolean {
  if (typeof desc !== 'string') return false;
  const want = categoryName.trim();
  if (displayCategoryKey(desc) === want) return true;
  return desc.startsWith('Redeemed coupon:') && desc.trim().endsWith(`(${want})`);
}
