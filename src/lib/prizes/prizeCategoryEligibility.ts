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

export function studentCanAffordPrizeByCategory(
  student: Pick<Student, 'points' | 'categoryPoints'>,
  prize: Pick<Prize, 'points' | 'categoryIds'>,
  categories: Category[],
  quantity = 1,
): boolean {
  const cost = Math.max(0, prize.points) * Math.max(1, quantity);
  if (!prizeHasCategoryRestriction(prize)) {
    return safePoints(student.points) >= cost;
  }
  return studentPrizeCategoryBalance(student, prize, categories) >= cost;
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
