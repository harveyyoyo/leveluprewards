import type { Category } from '@/lib/types';
import type {
  LibraryReturnSoundOnTimeId,
  LibraryReturnSoundLateId,
  LibraryReturnResponseOnTimeMode,
  LibraryReturnResponseLateMode,
} from './libraryAudio';

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
  /** Allow taking out / checking out books using the published ISBN barcode. Turned on by default. */
  allowIsbnCheckout: boolean;
  maxFineCap: number;
  cameraScanEnabled: boolean;
  kioskAllowDropBoxReturn: boolean;
  kioskAllowSelfReturn: boolean;
  returnSoundOnTime: LibraryReturnSoundOnTimeId;
  returnSoundLate: LibraryReturnSoundLateId;
  returnResponseOnTimeMode: LibraryReturnResponseOnTimeMode;
  returnResponseOnTimeCustom?: string;
  returnResponseLateMode: LibraryReturnResponseLateMode;
  returnResponseLateCustom?: string;
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
    libraryAllowIsbnCheckout?: boolean;
    libraryMaxFineCap?: number;
    libraryCameraScanEnabled?: boolean;
    libraryKioskAllowDropBoxReturn?: boolean;
    libraryKioskAllowSelfReturn?: boolean;
    libraryReturnSoundOnTime?: LibraryReturnSoundOnTimeId;
    libraryReturnSoundLate?: LibraryReturnSoundLateId;
    libraryReturnResponseOnTimeMode?: LibraryReturnResponseOnTimeMode;
    libraryReturnResponseOnTimeCustom?: string;
    libraryReturnResponseLateMode?: LibraryReturnResponseLateMode;
    libraryReturnResponseLateCustom?: string;
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
    allowIsbnCheckout: settings.libraryAllowIsbnCheckout !== false,
    maxFineCap: Math.max(0, settings.libraryMaxFineCap ?? 20),
    cameraScanEnabled: settings.libraryCameraScanEnabled === true,
    kioskAllowDropBoxReturn: settings.libraryKioskAllowDropBoxReturn !== false,
    kioskAllowSelfReturn: settings.libraryKioskAllowSelfReturn !== false,
    returnSoundOnTime: settings.libraryReturnSoundOnTime || 'chime_bright',
    returnSoundLate: settings.libraryReturnSoundLate || 'gentle_warning',
    returnResponseOnTimeMode: settings.libraryReturnResponseOnTimeMode || 'cheerful',
    returnResponseOnTimeCustom: settings.libraryReturnResponseOnTimeCustom,
    returnResponseLateMode: settings.libraryReturnResponseLateMode || 'gentle',
    returnResponseLateCustom: settings.libraryReturnResponseLateCustom,
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

/** Days that actually count toward a late fee after the school's grace period. */
export function computeChargeableLateDays(daysOverdue: number, gracePeriodDays = 0): number {
  if (daysOverdue <= 0) return 0;
  return Math.max(0, daysOverdue - Math.max(0, gracePeriodDays));
}

/** Late fee after grace days and an optional max-fine cap (0 = no cap). */
export function computeCappedLateFee(
  daysOverdue: number,
  pointsPerDay: number,
  gracePeriodDays = 0,
  maxFineCap = 0,
): number {
  const fee = computeLateFeePoints(computeChargeableLateDays(daysOverdue, gracePeriodDays), pointsPerDay);
  if (maxFineCap > 0) return Math.min(fee, maxFineCap);
  return fee;
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

/**
 * Resolves the effective checkout limit for a student.
 * If the student has a custom `libraryMaxCheckouts`, it takes precedence:
 * - 0 = unlimited books
 * - N > 0 = custom limit of N books
 * Otherwise falls back to school policy `maxCheckoutsPerStudent` (or default 3).
 */
export function resolveStudentMaxCheckouts(
  student?: { libraryMaxCheckouts?: number | null } | null,
  policyDefault: number = 3,
): number {
  if (
    student?.libraryMaxCheckouts !== undefined &&
    student?.libraryMaxCheckouts !== null &&
    typeof student.libraryMaxCheckouts === 'number' &&
    !isNaN(student.libraryMaxCheckouts)
  ) {
    return Math.max(0, student.libraryMaxCheckouts);
  }
  return Math.max(0, policyDefault);
}

