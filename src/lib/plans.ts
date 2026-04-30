/**
 * Per-school subscription plans and feature entitlements.
 *
 * Plans live on the school Firestore document (`schools/{schoolId}`):
 *   - `plan`: one of the `PlanTier` values. Defaults to 'free'.
 *   - `featureOverrides`: optional `{ [featureKey]: boolean }` that a developer
 *     can set on a per-school basis to grant a locked feature (true) or force
 *     an included feature off (false). Overrides win over the plan defaults.
 *
 * The SettingsProvider uses `getSchoolEntitlements` to compute the allowed
 * feature map and force any disallowed flag back to `false` when reading
 * settings from localStorage. The SettingsModal shows an "Upgrade plan"
 * state for features that aren't allowed by the school's plan.
 */

export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise';

/** Feature keys that are gated by plan. Must match keys on `Settings`. */
export type PlanFeatureKey =
  | 'enableAdminAnalytics'
  | 'enableTeacherCharts'
  | 'enableAttendance'
  | 'enableClassSignIn'
  | 'enableStudentPortal'
  | 'enableFaceLogin'
  | 'enableQrLogin'
  | 'enablePrizeImages'
  | 'enablePrizeAiSurprise'
  | 'enableVendingMachine'
  | 'enableWishlist'
  | 'enableAchievements'
  | 'enableBadges'
  | 'enableLevels'
  | 'enableStreaks'
  | 'enableGoals'
  | 'enableChallenges'
  | 'enableTeacherBudgets'
  | 'enableBulkPoints'
  | 'enablePointApproval'
  | 'enableAuditLog'
  | 'enablePdfExport'
  | 'enableParentView'
  | 'enableMultiAdmin'
  | 'enableNotifications'
  | 'enableClassLeaderboard'
  | 'enableShoutouts'
  | 'enableHomework'
  | 'enableSeasonalPrizes'
  | 'enableLibrary';

/** Ordered list of all gated features (used for UI iteration). */
export const PLAN_FEATURE_KEYS: PlanFeatureKey[] = [
  'enableAdminAnalytics',
  'enableTeacherCharts',
  'enableAttendance',
  'enableClassSignIn',
  'enableStudentPortal',
  'enableFaceLogin',
  'enableQrLogin',
  'enablePrizeImages',
  'enablePrizeAiSurprise',
  'enableVendingMachine',
  'enableWishlist',
  'enableAchievements',
  'enableBadges',
  'enableLevels',
  'enableStreaks',
  'enableGoals',
  'enableChallenges',
  'enableTeacherBudgets',
  'enableBulkPoints',
  'enablePointApproval',
  'enableAuditLog',
  'enablePdfExport',
  'enableParentView',
  'enableMultiAdmin',
  'enableNotifications',
  'enableClassLeaderboard',
  'enableShoutouts',
  'enableHomework',
      'enableLibrary',
  'enableSeasonalPrizes',
  'enableLibrary',
];

export interface PlanInfo {
  id: PlanTier;
  label: string;
  description: string;
  /** Features included in the plan by default. */
  features: PlanFeatureKey[];
}

/**
 * Default feature sets for each plan tier. Developers can grant extras or
 * revoke defaults via per-school `featureOverrides`.
 */
export const PLANS: Record<PlanTier, PlanInfo> = {
  free: {
    id: 'free',
    label: 'Free',
    description:
      'Core classroom essentials: students, classes, teachers, categories, prizes and coupons.',
    features: [],
  },
  basic: {
    id: 'basic',
    label: 'Basic',
    description:
      'Everything in Free, plus attendance, admin analytics and the at-home student portal.',
    features: [
      'enableAdminAnalytics',
      'enableAttendance',
      'enableClassSignIn',
      'enableStudentPortal',
      'enableTeacherBudgets',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    description:
      'Everything in Basic, plus engagement features (bonus points, badges, face login) and reporting.',
    features: [
      'enableAdminAnalytics',
      'enableTeacherCharts',
      'enableAttendance',
      'enableClassSignIn',
      'enableStudentPortal',
      'enableFaceLogin',
      'enablePrizeImages',
      'enablePrizeAiSurprise',
      'enableWishlist',
      'enableAchievements',
      'enableBadges',
      'enableGoals',
      'enableTeacherBudgets',
      'enableBulkPoints',
      'enablePdfExport',
      'enableClassLeaderboard',
      'enableHomework',
      'enableLibrary',
    ],
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    description:
      'Every current and upcoming feature is unlocked. Use for district-wide deployments.',
    features: [...PLAN_FEATURE_KEYS],
  },
};

export const DEFAULT_PLAN: PlanTier = 'free';

export const PLAN_TIERS: PlanTier[] = ['free', 'basic', 'pro', 'enterprise'];

/** Human-friendly labels for each gated feature (shown in the developer UI). */
export const PLAN_FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  enableAdminAnalytics: 'Admin Analytics',
  enableTeacherCharts: 'Teacher Analytics',
  enableAttendance: 'Attendance',
  enableClassSignIn: 'Class Sign-In',
  enableStudentPortal: 'Student Home Portal',
  enableFaceLogin: 'Face Login',
  enableQrLogin: 'QR Code Login',
  enablePrizeImages: 'Prize Photos',
  enablePrizeAiSurprise: 'AI Prize Surprise',
  enableVendingMachine: 'Vending Machine',
  enableWishlist: 'Student Wishlists',
  enableAchievements: 'Bonus Points',
  enableBadges: 'Badges',
  enableLevels: 'Levels',
  enableStreaks: 'Daily Streaks',
  enableGoals: 'Goals',
  enableChallenges: 'Challenges',
  enableTeacherBudgets: 'Teacher Budgets',
  enableBulkPoints: 'Bulk Class Points',
  enablePointApproval: 'Point Approval Queue',
  enableAuditLog: 'Audit Log',
  enablePdfExport: 'PDF Export',
  enableParentView: 'Parent View',
  enableMultiAdmin: 'Multi-Admin',
  enableNotifications: 'Notifications',
  enableClassLeaderboard: 'Class Leaderboard',
  enableShoutouts: 'Shoutouts',
  enableHomework: 'Homework Rewards',
  enableSeasonalPrizes: 'Seasonal Prizes',
  enableLibrary: 'Library Checkout',
};

export interface SchoolPlanConfig {
  plan?: PlanTier;
  /** Per-feature overrides that win over the plan defaults. */
  featureOverrides?: Partial<Record<PlanFeatureKey, boolean>>;
}

/** Resolves a plan value to a known tier, falling back to DEFAULT_PLAN. */
export function normalizePlan(value: unknown): PlanTier {
  if (typeof value === 'string' && (PLAN_TIERS as string[]).includes(value)) {
    return value as PlanTier;
  }
  return DEFAULT_PLAN;
}

/** Map of feature → allowed for a given school config. */
export type PlanEntitlements = Record<PlanFeatureKey, boolean>;

/**
 * Computes the effective feature entitlements for a school, combining the
 * selected plan tier with any developer-set overrides.
 */
export function getSchoolEntitlements(config: SchoolPlanConfig | null | undefined): PlanEntitlements {
  const plan = normalizePlan(config?.plan);
  const included = new Set<PlanFeatureKey>(PLANS[plan].features);
  const overrides = config?.featureOverrides ?? {};
  const entitlements = {} as PlanEntitlements;
  for (const key of PLAN_FEATURE_KEYS) {
    const override = overrides[key];
    if (typeof override === 'boolean') {
      entitlements[key] = override;
    } else {
      entitlements[key] = included.has(key);
    }
  }
  return entitlements;
}

/** True when a given feature is allowed for the given school config. */
export function isFeatureAllowed(
  config: SchoolPlanConfig | null | undefined,
  key: PlanFeatureKey,
): boolean {
  return getSchoolEntitlements(config)[key];
}

/** Type-guard to check whether a settings key is plan-gated. */
export function isPlanFeatureKey(key: string): key is PlanFeatureKey {
  return (PLAN_FEATURE_KEYS as string[]).includes(key);
}

