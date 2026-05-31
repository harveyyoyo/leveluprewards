/**
 * Per-school subscription plans and portal entitlements.
 *
 * Plans live on the school Firestore document (`schools/{schoolId}`):
 *   - `plan`: one of the `PlanTier` values. Defaults to 'free'.
 *   - `featureOverrides`: optional `{ [featureKey]: boolean }` that a developer
 *     can set on a per-school basis to grant a locked feature (true) or force
 *     an included feature off (false). Overrides win over the plan defaults.
 *
 * Subscription tiers are retained for developer billing labels only.
 * Runtime gating uses product pillars (`payClassroom`, `payAttendance`, `payLibrary`, `payHomework`, `payOffice`)
 * via `@/lib/productPillars` — not plan tiers.
 *
 * Sales levels ↔ pillars: `.agent/knowledge/product-ladder.md`
 */

export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise';

/** Feature keys that are gated by plan. Must match keys on `Settings`. */
export type PlanFeatureKey =
  | 'enableAdminAnalytics'
  | 'enableWeeklyRaffle'
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
  | 'enableClassAccumulations'
  | 'enableShoutouts'
  | 'enableHomework'
  | 'enableSeasonalPrizes';

/** Ordered list of all gated features (used for UI iteration). */
export const PLAN_FEATURE_KEYS: PlanFeatureKey[] = [
  'enableAdminAnalytics',
  'enableWeeklyRaffle',
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
  'enableClassAccumulations',
  'enableShoutouts',
  'enableHomework',
  'enableSeasonalPrizes',
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
      'Core classroom essentials: students, classes, teachers, categories, the rewards shop, and coupons.',
    features: ['enableWeeklyRaffle'],
  },
  basic: {
    id: 'basic',
    label: 'Basic',
    description:
      'Everything in Free, plus attendance, admin analytics and the at-home student portal.',
    features: [
      'enableAdminAnalytics',
      'enableWeeklyRaffle',
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
      'enableWeeklyRaffle',
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
      'enableClassAccumulations',
      'enableHomework',
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
  enableWeeklyRaffle: 'Raffle',
  enableTeacherCharts: 'Teacher Analytics',
  enableAttendance: 'Attendance',
  enableClassSignIn: 'Class Sign-In',
  enableStudentPortal: 'Student Home Portal',
  enableFaceLogin: 'Face Login',
  enableQrLogin: 'QR Code Login',
  enablePrizeImages: 'Reward Item Photos',
  enablePrizeAiSurprise: 'AI Rewards Shop Surprise',
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
  enableClassAccumulations: 'Class Accumulations',
  enableShoutouts: 'Shoutouts',
  enableHomework: 'Homework Rewards',
  enableSeasonalPrizes: 'Seasonal Reward Items',
};

export interface SchoolPlanConfig {
  plan?: PlanTier;
  /** Per-feature overrides that win over the plan defaults. */
  featureOverrides?: Partial<Record<PlanFeatureKey, boolean>>;
  /** Default on/off state for school settings when feature is granted. */
  featureSettingsDefaults?: Partial<Record<PlanFeatureKey, boolean>>;
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
 * @deprecated Plan tiers no longer gate features. Returns all features as allowed.
 * Use `@/lib/productPillars` for attendance, library, and homework pillars.
 */
export function getSchoolEntitlements(_config?: SchoolPlanConfig | null): PlanEntitlements {
  const entitlements = {} as PlanEntitlements;
  for (const key of PLAN_FEATURE_KEYS) {
    entitlements[key] = true;
  }
  return entitlements;
}

/** @deprecated Always true — see `productPillars.isSettingsKeyAllowed` for pillar gates. */
export function isFeatureAllowed(
  _config: SchoolPlanConfig | null | undefined,
  key: PlanFeatureKey,
): boolean {
  return getSchoolEntitlements(_config)[key];
}

/** Type-guard to check whether a settings key is plan-gated. */
export function isPlanFeatureKey(key: string): key is PlanFeatureKey {
  return (PLAN_FEATURE_KEYS as string[]).includes(key);
}

