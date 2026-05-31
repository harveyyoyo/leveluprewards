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

export function isProductPillarKey(key: string): key is ProductPillarKey {
  return (PRODUCT_PILLAR_KEYS as readonly string[]).includes(key);
}

/** Pillars default to on when unset (except School Office, which is opt-in). */
export function isPillarOn(settings: PillarSettings | null | undefined, pillar: ProductPillarKey): boolean {
  if (pillar === 'payOffice') return settings?.payOffice === true;
  return settings?.[pillar] !== false;
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

/** Classroom pillar on without Rewards — session seating + room display only. */
export function isClassroomOnlyMode(settings: PillarSettings | null | undefined): boolean {
  return isClassroomPillarOn(settings) && !isRewardsPillarOn(settings);
}

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
  options?: { expertMode?: boolean },
): boolean {
  if (options?.expertMode) return true;
  if (isProductPillarKey(key)) return isPillarOn(settings, key);
  const pillar = pillarRequiredForFeature(key);
  if (pillar) return isPillarOn(settings, pillar);
  return true;
}

export function formatActivePillars(settings: PillarSettings | null | undefined): string {
  const active = PRODUCT_PILLAR_KEYS.filter((k) => isPillarOn(settings, k)).map((k) => PRODUCT_PILLAR_LABELS[k]);
  return active.length ? active.join(' · ') : 'No pillars enabled';
}
