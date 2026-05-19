import type { Category } from '@/lib/types';

/** School settings slice used for library loans and late fees. */
export type LibraryPolicySettings = {
  loanPeriodDays: number;
  lateFeesEnabled: boolean;
  latePointsPerDay: number;
  onTimeReturnPoints: number;
  pointsCategoryId?: string;
  pointsCategoryName?: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getLibraryPolicyFromSettings(
  settings: {
    libraryLoanPeriodDays?: number;
    libraryLateFeesEnabled?: boolean;
    libraryLatePointsPerDay?: number;
    libraryOnTimeReturnPoints?: number;
    libraryPointsCategoryId?: string;
  },
  categories?: Category[] | null,
): LibraryPolicySettings {
  const loanPeriodDays =
    typeof settings.libraryLoanPeriodDays === 'number' && settings.libraryLoanPeriodDays > 0
      ? settings.libraryLoanPeriodDays
      : 14;
  const latePointsPerDay =
    typeof settings.libraryLatePointsPerDay === 'number' && settings.libraryLatePointsPerDay >= 0
      ? settings.libraryLatePointsPerDay
      : 2;
  const onTimeReturnPoints =
    typeof settings.libraryOnTimeReturnPoints === 'number' && settings.libraryOnTimeReturnPoints > 0
      ? settings.libraryOnTimeReturnPoints
      : 0;
  const categoryId = settings.libraryPointsCategoryId?.trim() || undefined;
  const category = categoryId ? categories?.find((c) => c.id === categoryId) : undefined;

  return {
    loanPeriodDays,
    lateFeesEnabled: settings.libraryLateFeesEnabled !== false,
    latePointsPerDay,
    onTimeReturnPoints,
    pointsCategoryId: categoryId,
    pointsCategoryName: category?.name,
  };
}

export function computeDueAt(checkedOutAt: number, loanPeriodDays: number): number {
  return checkedOutAt + loanPeriodDays * MS_PER_DAY;
}

export function computeDaysOverdue(dueAt: number | null | undefined, now = Date.now()): number {
  if (!dueAt || dueAt <= 0) return 0;
  if (now <= dueAt) return 0;
  return Math.ceil((now - dueAt) / MS_PER_DAY);
}

export function computeLateFeePoints(daysOverdue: number, pointsPerDay: number): number {
  if (daysOverdue <= 0 || pointsPerDay <= 0) return 0;
  return daysOverdue * pointsPerDay;
}

export function formatDueDate(dueAt: number | null | undefined): string {
  if (!dueAt) return 'No due date';
  return new Date(dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
