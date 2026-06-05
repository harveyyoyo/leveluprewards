export type DisplayView = 'smart' | 'bulletin';

export const LEGACY_DISPLAY_TAB_VALUES = ['bulletinboard', 'smart-screen'] as const;

/** Map legacy admin/teacher tab ids to the unified Displays tab. */
export function normalizeStaffPortalTabValue(tabValue: string): string {
  if (tabValue === 'bulletinboard' || tabValue === 'smart-screen') return 'displays';
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
  bulletinEnabled?: boolean;
  smartScreenEnabled?: boolean;
}): boolean {
  return settings.bulletinEnabled !== false || !!settings.smartScreenEnabled;
}

export function parseDisplayView(value: string | null | undefined): DisplayView {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'bulletin' || normalized === 'bulletin-board' || normalized === 'board') {
    return 'bulletin';
  }
  return 'smart';
}

type SmartScreenHrefOptions = {
  fullscreen?: boolean;
  layout?: string;
  theme?: string;
  zip?: string;
  screenProfileId?: string;
};

export function buildSmartScreenDisplayHref(schoolId: string, options: SmartScreenHrefOptions = {}): string {
  const params = new URLSearchParams();
  params.set('view', 'smart');
  if (options.fullscreen) params.set('fullscreen', '1');
  if (options.layout) params.set('layout', options.layout);
  if (options.theme) params.set('theme', options.theme);
  if (options.zip && /^\d{5}$/.test(options.zip)) params.set('zip', options.zip);
  if (options.screenProfileId) params.set('screenProfileId', options.screenProfileId);
  return `/${schoolId}/displays?${params.toString()}`;
}

export function buildBulletinDisplayHref(schoolId: string, options: { fullscreen?: boolean } = {}): string {
  const params = new URLSearchParams();
  params.set('view', 'bulletin');
  if (options.fullscreen) params.set('fullscreen', '1');
  return `/${schoolId}/displays?${params.toString()}`;
}

export function buildDisplayHref(
  schoolId: string,
  view: DisplayView,
  options: SmartScreenHrefOptions = {},
): string {
  return view === 'bulletin'
    ? buildBulletinDisplayHref(schoolId, { fullscreen: options.fullscreen })
    : buildSmartScreenDisplayHref(schoolId, options);
}
