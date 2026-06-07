/**
 * Product pillars are the only subscription-style gates in the app.
 * Each pillar maps to a `pay*` flag on school `appSettings`.
 *
 * Sales levels ↔ pillars: see `.agent/knowledge/product-ladder.md`
 */

export const PRODUCT_PILLAR_KEYS = [
  'payClassroom',
  'payAttendance',
  'payLibrary',
  'payHomework',
  'payOffice',
] as const;

export type ProductPillarKey = (typeof PRODUCT_PILLAR_KEYS)[number];

export const PRODUCT_PILLAR_LABELS: Record<ProductPillarKey, string> = {
  payClassroom: 'Classroom Management',
  payAttendance: 'Attendance',
  payLibrary: 'Library',
  payHomework: 'Homework',
  payOffice: 'School Office',
};

export type PillarSettings = Partial<Record<ProductPillarKey, boolean>> & {
  payRewards?: boolean;
};

export type ProductPillarAccess = Partial<Record<ProductPillarKey, boolean>>;

export function isProductPillarKey(key: string): key is ProductPillarKey {
  return (PRODUCT_PILLAR_KEYS as readonly string[]).includes(key);
}

/**
 * Access defaults to true for existing schools so adding this field does not
 * remove products from schools that were configured before `pillarAccess`.
 */
export function hasPillarAccess(
  access: ProductPillarAccess | null | undefined,
  pillar: ProductPillarKey,
): boolean {
  return access?.[pillar] !== false;
}

/** Pillars default to on when unset (except School Office, which is opt-in). */
export function isPillarOn(
  settings: PillarSettings | null | undefined,
  pillar: ProductPillarKey,
  access?: ProductPillarAccess | null,
): boolean {
  if (!hasPillarAccess(access, pillar)) return false;
  if (pillar === 'payOffice') return settings?.payOffice === true;
  return settings?.[pillar] !== false;
}

export function applyPillarAccessToSettings<T extends PillarSettings>(
  settings: T,
  access: ProductPillarAccess | null | undefined,
): T {
  const next = { ...settings } as T;
  for (const pillar of PRODUCT_PILLAR_KEYS) {
    if (!hasPillarAccess(access, pillar)) {
      (next as Record<ProductPillarKey, boolean>)[pillar] = false;
    }
  }
  return next;
}

/** School Office pillar — grades & billing portal (off unless explicitly enabled). */
export function isOfficePillarOn(settings: PillarSettings | null | undefined): boolean {
  return isPillarOn(settings, 'payOffice');
}

/**
 * Rewards Core pillar (Level 1) — student-facing economy surfaces:
 * kiosk, prize shop, coupon redemption, student-home prize flows.
 *
 * Teacher-operational tools (raffle draw, goals, attendance, homework) are gated
 * by their own flags/pillars, not by `payRewards`.
 */
export function isRewardsPillarOn(settings: PillarSettings | null | undefined): boolean {
  return settings?.payRewards !== false;
}

/** Student kiosk / prize shop / coupon redemption UI. Alias for clarity at call sites. */
export function isStudentRewardsUiOn(settings: PillarSettings | null | undefined): boolean {
  return isRewardsPillarOn(settings);
}

/** Classroom Management pillar — seating chart and quick awards (Level 2). Smart Screen is not gated here. */
export function isClassroomPillarOn(settings: PillarSettings | null | undefined): boolean {
  return isPillarOn(settings, 'payClassroom');
}

export type ParentPortalSettings = PillarSettings & {
  enableParentView?: boolean;
};

/** Parent portal sign-in and portal-page card — off unless explicitly enabled. */
export function isParentPortalOn(settings: ParentPortalSettings | null | undefined): boolean {
  return isClassroomPillarOn(settings) && settings?.enableParentView === true;
}

/** Classroom pillar on without Rewards — session seating + room display only. */
export function isClassroomOnlyMode(settings: PillarSettings | null | undefined): boolean {
  return isClassroomPillarOn(settings) && !isRewardsPillarOn(settings);
}

/** User-facing copy when Classroom awards sync into the main rewards balance. */
export const CLASSROOM_LOCAL_REWARDS = {
  tabBody:
    'Each quick-award button becomes its own category on the student record and counts toward the main rewards balance when LevelUp Rewards is on.',
  toastDescription: 'Saved to the main rewards balance under this quick-award category.',
} as const;

/** User-facing copy when Classroom is on but Rewards (student economy) is off. */
export const CLASSROOM_SESSION_ONLY = {
  /** Short banner in the seating chart */
  bannerTitle: 'Classroom points mode',
  bannerBody:
    'LevelUp Rewards is off. Desk taps are saved as classroom points (activity history + classroom balance) — not kiosk or prize-shop balances.',
  bannerHint:
    'Classroom points stay on the student record and show in the parent portal. Turn on LevelUp Rewards to also sync awards into the main rewards balance.',
  /** Admin / tab header */
  tabBody:
    'LevelUp Rewards is off. Teachers can use seating, behavior notes, and the room display. Quick awards are saved as classroom points on each student (with a full activity log), separate from kiosk balances.',
  /** Toast after a tap */
  toastDescription:
    'Saved as classroom points on the student record (not kiosk/rewards balance).',
} as const;

/** Feature toggles that require a product pillar to be on. */
const FEATURE_REQUIRES_PILLAR: Partial<Record<string, ProductPillarKey>> = {
  enableHomework: 'payHomework',
  enableAttendance: 'payAttendance',
  enableClassSignIn: 'payAttendance',
  enableParentView: 'payClassroom',
};

export function pillarRequiredForFeature(key: string): ProductPillarKey | undefined {
  if (key.startsWith('library')) return 'payLibrary';
  return FEATURE_REQUIRES_PILLAR[key];
}

/**
 * True when the key may be used: pillar keys reflect their own flag;
 * mapped features require the pillar; everything else is always allowed.
 */
export function isSettingsKeyAllowed(
  settings: PillarSettings | null | undefined,
  key: string,
  options?: { expertMode?: boolean; pillarAccess?: ProductPillarAccess | null },
): boolean {
  if (options?.expertMode) return true;
  if (isProductPillarKey(key)) return hasPillarAccess(options?.pillarAccess, key);
  const pillar = pillarRequiredForFeature(key);
  if (pillar) return hasPillarAccess(options?.pillarAccess, pillar) && isPillarOn(settings, pillar);
  return true;
}

export function formatActivePillars(settings: PillarSettings | null | undefined): string {
  const active = PRODUCT_PILLAR_KEYS.filter((k) => isPillarOn(settings, k)).map((k) => PRODUCT_PILLAR_LABELS[k]);
  return active.length ? active.join(' · ') : 'No pillars enabled';
}
