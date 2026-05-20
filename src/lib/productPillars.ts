/**
 * Product pillars are the only subscription-style gates in the app.
 * Each pillar maps to a `pay*` flag on school `appSettings`.
 */

export const PRODUCT_PILLAR_KEYS = ['payAttendance', 'payLibrary', 'payHomework', 'payOffice'] as const;

export type ProductPillarKey = (typeof PRODUCT_PILLAR_KEYS)[number];

export const PRODUCT_PILLAR_LABELS: Record<ProductPillarKey, string> = {
  payAttendance: 'Attendance',
  payLibrary: 'Library',
  payHomework: 'Homework',
  payOffice: 'School Office',
};

export type PillarSettings = Partial<Record<ProductPillarKey, boolean>>;

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

/** Feature toggles that require a product pillar to be on. */
const FEATURE_REQUIRES_PILLAR: Partial<Record<string, ProductPillarKey>> = {
  enableHomework: 'payHomework',
  enableAttendance: 'payAttendance',
  enableClassSignIn: 'payAttendance',
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
