export type DisplayModePreference = 'auto' | 'web' | 'app' | 'mobile';
export type ResolvedDisplayMode = 'web' | 'app' | 'mobile';

export type DisplayModeViewport = {
  /** Viewport width below the phone breakpoint (<768px). */
  isPhone: boolean;
  /** Viewport width below the tablet breakpoint (<1024px). */
  isTabletOrMobile: boolean;
};

/** Portal hub cards kept in mobile display (on-the-go staff + student kiosk). */
export const MOBILE_PORTAL_IDS = new Set(['print', 'redeem']);

/** Bottom dock destinations kept in mobile display. */
export const MOBILE_DOCK_IDS = new Set(['print', 'redeem']);

export function normalizeDisplayModePreference(value: unknown): DisplayModePreference {
  if (value === 'web' || value === 'app' || value === 'mobile' || value === 'auto') return value;
  return 'auto';
}

/** App- and mobile-style compact chrome (bottom dock, tighter portal cards). */
export function isCompactDisplayMode(mode: ResolvedDisplayMode): boolean {
  return mode === 'app' || mode === 'mobile';
}

export function isMobileDisplayMode(mode: ResolvedDisplayMode): boolean {
  return mode === 'mobile';
}

export function isPortalAreaOnDisplayMode(portalId: string, mode: ResolvedDisplayMode): boolean {
  if (!isMobileDisplayMode(mode)) return true;
  return MOBILE_PORTAL_IDS.has(portalId);
}

export function isDockItemOnDisplayMode(dockId: string, mode: ResolvedDisplayMode): boolean {
  if (!isMobileDisplayMode(mode)) return true;
  return MOBILE_DOCK_IDS.has(dockId);
}

/** Resolve stored preference to the layout the UI should render. */
export function resolveDisplayMode(
  preference: DisplayModePreference | undefined,
  viewport: DisplayModeViewport,
): ResolvedDisplayMode {
  const pref = normalizeDisplayModePreference(preference);
  if (pref === 'mobile') return 'mobile';
  if (pref === 'web') return 'web';
  if (pref === 'app') return 'app';
  if (viewport.isPhone) return 'mobile';
  if (viewport.isTabletOrMobile) return 'app';
  return 'web';
}
