export type DisplayView = 'smart' | 'bulletin' | 'hall-of-fame';

/** Template order for the merged Displays feature ??? Hall of Fame is the default/first template. */
export const DISPLAY_TEMPLATE_ORDER: readonly DisplayView[] = ['hall-of-fame', 'smart', 'bulletin'];

export const LEGACY_DISPLAY_TAB_VALUES = ['bulletinboard', 'smart-screen'] as const;

/** Map legacy admin/teacher tab ids to the unified Displays / Classroom tabs. */
export function normalizeStaffPortalTabValue(tabValue: string): string {
  if (tabValue === 'bulletinboard' || tabValue === 'smart-screen' || tabValue === 'halloffame') {
    return 'displays';
  }
  if (tabValue === 'raffle') {
    return 'classroom';
  }
  return tabValue;
}

export function normalizeStaffPortalTabValues(tabValues: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const value of tabValues) {
    seen.add(normalizeStaffPortalTabValue(value));
  }
  return [...seen];
}

export function displaysFeatureEnabled(settings: {
  displaysEnabled?: boolean;
  bulletinEnabled?: boolean;
  smartScreenEnabled?: boolean;
  enableClassLeaderboard?: boolean;
}): boolean {
  if (typeof settings.displaysEnabled === 'boolean') return settings.displaysEnabled;
  // Back-compat for settings docs saved before the merge into one `displaysEnabled` flag.
  return (
    settings.bulletinEnabled !== false ||
    !!settings.smartScreenEnabled ||
    !!settings.enableClassLeaderboard
  );
}

export function parseDisplayView(value: string | null | undefined): DisplayView {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'bulletin' || normalized === 'bulletin-board' || normalized === 'board') {
    return 'bulletin';
  }
  if (
    normalized === 'hall-of-fame' ||
    normalized === 'halloffame' ||
    normalized === 'hall_of_fame' ||
    normalized === 'fame' ||
    normalized === 'leaderboard'
  ) {
    return 'hall-of-fame';
  }
  if (normalized === 'smart' || normalized === 'smart-screen') {
    return 'smart';
  }
  // Hall of Fame is the default/first template when nothing else matches.
  return 'hall-of-fame';
}

export type DisplayHrefOptions = {
  fullscreen?: boolean;
  /** Named screen version — layout, theme, and modules come from saved app settings live. */
  screenProfileId?: string;
  /** Custom named display id. */
  displayId?: string;
};

export function buildSmartScreenDisplayHref(schoolId: string, options: DisplayHrefOptions = {}): string {
  const params = new URLSearchParams();
  params.set('view', 'smart');
  if (options.fullscreen) params.set('fullscreen', '1');
  if (options.screenProfileId) params.set('screenProfileId', options.screenProfileId);
  if (options.displayId) params.set('displayId', options.displayId);
  return `/${schoolId}/displays?${params.toString()}`;
}

export function buildBulletinDisplayHref(schoolId: string, options: DisplayHrefOptions = {}): string {
  const params = new URLSearchParams();
  params.set('view', 'bulletin');
  if (options.fullscreen) params.set('fullscreen', '1');
  if (options.displayId) params.set('displayId', options.displayId);
  return `/${schoolId}/displays?${params.toString()}`;
}

export function buildHallOfFameDisplayHref(
  schoolId: string,
  options: DisplayHrefOptions = {},
): string {
  const params = new URLSearchParams();
  params.set('view', 'hall-of-fame');
  if (options.fullscreen) params.set('fullscreen', '1');
  if (options.displayId) params.set('displayId', options.displayId);
  return `/${schoolId}/displays?${params.toString()}`;
}

export function buildDisplayHref(
  schoolId: string,
  view: DisplayView,
  options: DisplayHrefOptions = {},
): string {
  if (view === 'bulletin') {
    return buildBulletinDisplayHref(schoolId, options);
  }
  if (view === 'hall-of-fame') {
    return buildHallOfFameDisplayHref(schoolId, options);
  }
  return buildSmartScreenDisplayHref(schoolId, options);
}

/** Path to the standalone Displays experience (settings + fullscreen launch, no app chrome). */
export function displaysRealmHref(schoolId: string): string {
  return `/${schoolId.trim().toLowerCase()}/displays-realm`;
}

/** Opens in a new tab ??? absolute URL when possible. */
export function displaysRealmOpenHref(schoolId: string): string {
  const href = displaysRealmHref(schoolId);
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${href}`;
  }
  return href;
}
