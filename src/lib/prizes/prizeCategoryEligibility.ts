import {
  classroomTeacherCategoryKey,
  displayCategoryKey,
  isTeacherScopedCategoryKey,
} from '@/lib/classroom/classroomRewardCategories';
import type { Category, Prize, Student } from '@/lib/types';

function safePoints(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

export function prizeCategoryIds(prize: Pick<Prize, 'categoryIds'>): string[] {
  return [...(prize.categoryIds || [])].filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export function prizeHasCategoryRestriction(prize: Pick<Prize, 'categoryIds'>): boolean {
  return prizeCategoryIds(prize).length > 0;
}

/** Resolve categories linked to a prize (missing ids are ignored). */
export function resolvePrizeCategories(prize: Pick<Prize, 'categoryIds'>, categories: Category[]): Category[] {
  const ids = new Set(prizeCategoryIds(prize));
  if (ids.size === 0) return [];
  return categories.filter((c) => ids.has(c.id));
}

/** Balance in one category — supports school-wide names and teacher-scoped classroom keys. */
export function studentCategoryBalance(
  student: Pick<Student, 'categoryPoints'>,
  category: Category,
): number {
  const cp = student.categoryPoints || {};
  const name = category.name.trim();
  if (!name) return 0;

  if (category.teacherId) {
    return safePoints(cp[classroomTeacherCategoryKey(category.teacherId, name)]);
  }

  const plain = safePoints(cp[name]);
  if (plain > 0) return plain;

  // Legacy classroom keys may exist without a Category.teacherId — sum matching scoped keys.
  let scopedTotal = 0;
  for (const [key, value] of Object.entries(cp)) {
    if (!isTeacherScopedCategoryKey(key)) continue;
    if (displayCategoryKey(key).toLowerCase() === name.toLowerCase()) {
      scopedTotal += safePoints(value);
    }
  }
  return scopedTotal;
}

/** Combined balance across all categories assigned to a prize. */
export function studentPrizeCategoryBalance(
  student: Pick<Student, 'categoryPoints'>,
  prize: Pick<Prize, 'categoryIds'>,
  categories: Category[],
): number {
  const linked = resolvePrizeCategories(prize, categories);
  if (linked.length === 0) return safePoints((student as Student).points);
  return linked.reduce((sum, cat) => sum + studentCategoryBalance(student, cat), 0);
}

/** Wallet that can actually pay for this prize (category pile, or whole balance). */
export function studentSpendablePointsForPrize(
  student: Pick<Student, 'points' | 'categoryPoints'>,
  prize: Pick<Prize, 'categoryIds'>,
  categories: Category[],
): number {
  if (!prizeHasCategoryRestriction(prize)) return safePoints(student.points);
  return studentPrizeCategoryBalance(student, prize, categories);
}

export function joinCategoryNames(names: string[]): string {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return '';
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} or ${unique[1]}`;
  return `${unique.slice(0, -1).join(', ')}, or ${unique[unique.length - 1]}`;
}

/** Human-readable category names this prize spends from, or empty if any points work. */
export function prizeRequiredCategoryLabel(
  prize: Pick<Prize, 'categoryIds'>,
  categories: Category[],
): string {
  return joinCategoryNames(resolvePrizeCategories(prize, categories).map((c) => c.name));
}

export function studentCanAffordPrizeByCategory(
  student: Pick<Student, 'points' | 'categoryPoints'>,
  prize: Pick<Prize, 'points' | 'categoryIds'>,
  categories: Category[],
  quantity = 1,
): boolean {
  const cost = Math.max(0, prize.points) * Math.max(1, quantity);
  return studentSpendablePointsForPrize(student, prize, categories) >= cost;
}

/**
 * Balance shown after a purchase attempt.
 * If they can buy it, use the big wallet (what the header becomes).
 * If they cannot, use the spendable pile so leftover cannot look like a successful buy.
 */
export function shownBalanceAfterPrizePurchase(
  totalPoints: number,
  spendablePoints: number,
  cost: number,
  canAfford: boolean,
): number {
  return (canAfford ? totalPoints : spendablePoints) - cost;
}

/** Short student-facing reason they cannot buy, or null if they can. */
export function describePrizeShortage(
  student: Pick<Student, 'points' | 'categoryPoints'>,
  prize: Pick<Prize, 'points' | 'categoryIds'>,
  categories: Category[],
  quantity = 1,
): string | null {
  if (studentCanAffordPrizeByCategory(student, prize, categories, quantity)) return null;
  const cost = Math.max(0, prize.points) * Math.max(1, quantity);
  const spendable = studentSpendablePointsForPrize(student, prize, categories);
  const label = prizeRequiredCategoryLabel(prize, categories);
  if (label) {
    return `This prize uses ${label} points. You have ${spendable.toLocaleString()} and need ${cost.toLocaleString()}.`;
  }
  return `You don't have enough points for this quantity. You have ${spendable.toLocaleString()} and need ${cost.toLocaleString()}.`;
}

/** Deduct `cost` from category balances (mutates a copy). Returns updated map or null if insufficient. */
export function deductCategoryPointsForPrize(
  categoryPoints: Record<string, number>,
  prize: Pick<Prize, 'categoryIds'>,
  categories: Category[],
  cost: number,
): Record<string, number> | null {
  const linked = resolvePrizeCategories(prize, categories);
  if (linked.length === 0 || cost <= 0) return { ...categoryPoints };

  const next = { ...categoryPoints };
  let remaining = cost;

  for (const category of linked) {
    if (remaining <= 0) break;
    const name = category.name.trim();
    if (!name) continue;

    if (category.teacherId) {
      const key = classroomTeacherCategoryKey(category.teacherId, name);
      const available = safePoints(next[key]);
      const take = Math.min(available, remaining);
      if (take > 0) {
        next[key] = available - take;
        if (next[key] <= 0) delete next[key];
        remaining -= take;
      }
      continue;
    }

    const plainAvailable = safePoints(next[name]);
    const plainTake = Math.min(plainAvailable, remaining);
    if (plainTake > 0) {
      next[name] = plainAvailable - plainTake;
      if (next[name] <= 0) delete next[name];
      remaining -= plainTake;
    }

    if (remaining <= 0) break;

    for (const [key, value] of Object.entries(next)) {
      if (remaining <= 0) break;
      if (!isTeacherScopedCategoryKey(key)) continue;
      if (displayCategoryKey(key).toLowerCase() !== name.toLowerCase()) continue;
      const available = safePoints(value);
      const take = Math.min(available, remaining);
      if (take > 0) {
        next[key] = available - take;
        if (next[key] <= 0) delete next[key];
        remaining -= take;
      }
    }
  }

  return remaining <= 0 ? next : null;
}
