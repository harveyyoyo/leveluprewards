import type { Category } from '@/lib/types';

/** How library returns affect student balances. */
export type LibraryRewardMode = 'none' | 'fines' | 'app_points' | 'isolated_points';

/** School settings slice used for library loans and late fees. */
export type LibraryPolicySettings = {
  rewardMode: LibraryRewardMode;
  loanPeriodDays: number;
  lateFeesEnabled: boolean;
  latePointsPerDay: number;
  onTimeReturnPoints: number;
  pointsCategoryId?: string;
  pointsCategoryName?: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function resolveLibraryRewardMode(settings: {
  libraryRewardMode?: LibraryRewardMode;
  libraryPointsCategoryId?: string;
  libraryLateFeesEnabled?: boolean;
  libraryLatePointsPerDay?: number;
  libraryOnTimeReturnPoints?: number;
}): LibraryRewardMode {
  if (settings.libraryRewardMode) return settings.libraryRewardMode;
  const categoryId = settings.libraryPointsCategoryId?.trim();
  const hasLate =
    settings.libraryLateFeesEnabled !== false &&
    (settings.libraryLatePointsPerDay ?? 2) > 0;
  const hasBonus = (settings.libraryOnTimeReturnPoints ?? 0) > 0;
  if (categoryId && (hasLate || hasBonus)) return 'app_points';
  return 'none';
}

export function getLibraryPolicyFromSettings(
  settings: {
    libraryRewardMode?: LibraryRewardMode;
    libraryLoanPeriodDays?: number;
    libraryLateFeesEnabled?: boolean;
    libraryLatePointsPerDay?: number;
    libraryOnTimeReturnPoints?: number;
    libraryPointsCategoryId?: string;
  },
  categories?: Category[] | null,
): LibraryPolicySettings {
  const rewardMode = resolveLibraryRewardMode(settings);
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
    rewardMode,
    loanPeriodDays,
    lateFeesEnabled: settings.libraryLateFeesEnabled !== false,
    latePointsPerDay,
    onTimeReturnPoints,
    pointsCategoryId: categoryId,
    pointsCategoryName: category?.name,
  };
}

/** True when returns should run through the server callable (points/fines/isolated). */
export function libraryReturnUsesServer(policy?: LibraryPolicySettings): boolean {
  if (!policy || policy.rewardMode === 'none') return false;
  if (policy.rewardMode === 'fines') {
    return policy.lateFeesEnabled && policy.latePointsPerDay > 0;
  }
  if (policy.rewardMode === 'isolated_points') {
    return (
      (policy.lateFeesEnabled && policy.latePointsPerDay > 0) || policy.onTimeReturnPoints > 0
    );
  }
  if (policy.rewardMode === 'app_points') {
    if (!policy.pointsCategoryName) return false;
    return policy.lateFeesEnabled || policy.onTimeReturnPoints > 0;
  }
  return false;
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

export const LIBRARY_REWARD_MODE_LABELS: Record<LibraryRewardMode, string> = {
  none: 'Nothing (loans only)',
  fines: 'Library fines (not tied to rewards)',
  app_points: 'School points (rewards app)',
  isolated_points: 'Library points only (separate balance)',
};
