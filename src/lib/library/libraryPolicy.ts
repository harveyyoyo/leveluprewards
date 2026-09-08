import type { Category } from '@/lib/types';

/** How library returns affect student balances. */
export type LibraryRewardMode = 'none' | 'fines' | 'app_points' | 'isolated_points';

/** School settings slice used for library loans and late fees. */
export type LibraryPolicySettings = {
  rewardMode: LibraryRewardMode;
  loanPeriodDays: number;
  /** Max books a student may have checked out at once. 0 = unlimited. */
  maxCheckoutsPerStudent: number;
  lateFeesEnabled: boolean;
  latePointsPerDay: number;
  onTimeReturnPoints: number;
  pointsCategoryId?: string;
  pointsCategoryName?: string;
  autoDetectCirculation: boolean;
  gracePeriodDays: number;
  maxRenewals: number;
  renewalDays: number;
  allowRenewIfOverdue: boolean;
  allowMultipleCopiesOfSameTitle: boolean;
  maxFineCap: number;
  cameraScanEnabled: boolean;
  kioskAllowDropBoxReturn: boolean;
  kioskAllowSelfReturn: boolean;
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
    libraryMaxCheckoutsPerStudent?: number;
    libraryLateFeesEnabled?: boolean;
    libraryLatePointsPerDay?: number;
    libraryOnTimeReturnPoints?: number;
    libraryPointsCategoryId?: string;
    libraryAutoDetectCirculation?: boolean;
    libraryGracePeriodDays?: number;
    libraryMaxRenewals?: number;
    libraryRenewalDays?: number;
    libraryAllowRenewIfOverdue?: boolean;
    libraryAllowMultipleCopiesOfSameTitle?: boolean;
    libraryMaxFineCap?: number;
    libraryCameraScanEnabled?: boolean;
    libraryKioskAllowDropBoxReturn?: boolean;
    libraryKioskAllowSelfReturn?: boolean;
  },
  categories?: Category[] | null,
): LibraryPolicySettings {
  const rewardMode = resolveLibraryRewardMode(settings);
  const loanPeriodDays = Math.max(1, settings.libraryLoanPeriodDays ?? 14);
  const maxCheckoutsPerStudent =
    settings.libraryMaxCheckoutsPerStudent !== undefined
      ? Math.max(0, settings.libraryMaxCheckoutsPerStudent)
      : 3;
  const latePointsPerDay = Math.max(0, settings.libraryLatePointsPerDay ?? 2);
  const onTimeReturnPoints = Math.max(0, settings.libraryOnTimeReturnPoints ?? 0);
  const categoryId = settings.libraryPointsCategoryId?.trim();
  const category = categoryId && categories ? categories.find((c) => c.id === categoryId) : undefined;

  return {
    rewardMode,
    loanPeriodDays,
    maxCheckoutsPerStudent,
    lateFeesEnabled: settings.libraryLateFeesEnabled !== false,
    latePointsPerDay,
    onTimeReturnPoints,
    pointsCategoryId: categoryId,
    pointsCategoryName: category?.name,
    autoDetectCirculation: settings.libraryAutoDetectCirculation !== false,
    gracePeriodDays: Math.max(0, settings.libraryGracePeriodDays ?? 0),
    maxRenewals: Math.max(0, settings.libraryMaxRenewals ?? 2),
    renewalDays: Math.max(1, settings.libraryRenewalDays ?? loanPeriodDays),
    allowRenewIfOverdue: settings.libraryAllowRenewIfOverdue === true,
    allowMultipleCopiesOfSameTitle: settings.libraryAllowMultipleCopiesOfSameTitle === true,
    maxFineCap: Math.max(0, settings.libraryMaxFineCap ?? 20),
    cameraScanEnabled: settings.libraryCameraScanEnabled === true,
    kioskAllowDropBoxReturn: settings.libraryKioskAllowDropBoxReturn !== false,
    kioskAllowSelfReturn: settings.libraryKioskAllowSelfReturn !== false,
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

export type LibraryStudentCheckoutSettings = {
  payLibrary?: boolean;
  /** Signed-in student kiosk: LIB barcode on the coupon scan card. Default on when library is enabled. */
  libraryStudentKioskCheckoutEnabled?: boolean;
  /** Shared station at /library/self-checkout (scan ID, then books). Default off. */
  libraryAutoStudentPortalEnabled?: boolean;
};

export function isLibraryPillarEnabled(settings: LibraryStudentCheckoutSettings): boolean {
  return settings.payLibrary !== false;
}

export function isLibraryStudentKioskCheckoutEnabled(settings: LibraryStudentCheckoutSettings): boolean {
  if (!isLibraryPillarEnabled(settings)) return false;
  return settings.libraryStudentKioskCheckoutEnabled !== false;
}

export function isLibraryStandaloneSelfCheckoutEnabled(settings: LibraryStudentCheckoutSettings): boolean {
  if (!isLibraryPillarEnabled(settings)) return false;
  return settings.libraryAutoStudentPortalEnabled !== false;
}
