export type DisplayModePreference = 'auto' | 'web' | 'app';
export type ResolvedDisplayMode = 'web' | 'app';

export function normalizeDisplayModePreference(value: unknown): DisplayModePreference {
  if (value === 'web' || value === 'app' || value === 'auto') return value;
  return 'auto';
}

/** Resolve stored preference to the layout the UI should render. */
export function resolveDisplayMode(
  preference: DisplayModePreference | undefined,
  isTabletOrMobile: boolean,
): ResolvedDisplayMode {
  const pref = normalizeDisplayModePreference(preference);
  if (pref === 'auto') return isTabletOrMobile ? 'app' : 'web';
  return pref;
}
