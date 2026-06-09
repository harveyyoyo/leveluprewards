/** Top-level settings modal views. */
export type SettingsView =
  | 'hub'
  | 'interface'
  | 'general'
  | 'features'
  | 'pillars'
  | 'device'
  | 'faceEnrollments';

/** @deprecated Use `general`. Kept for deep links. */
const LEGACY_GENERAL_VIEW = 'security' as const;

export function parseSettingsViewFromQuery(value: string | null): SettingsView | null {
    if (value === 'hub') return 'hub';
    if (value === 'features') return 'features';
    if (value === 'interface') return 'interface';
    if (value === 'general' || value === LEGACY_GENERAL_VIEW) return 'general';
    if (value === 'pillars') return 'pillars';
    if (value === 'device') return 'device';
    if (value === 'faceEnrollments') return 'faceEnrollments';
    return null;
}

export const FEATURE_SECTION_NAV = [
    { id: 'settings-features-core', label: 'Core' },
    { id: 'settings-features-recognition', label: 'Recognition' },
    { id: 'settings-features-displays', label: 'Displays' },
    { id: 'settings-features-shop', label: 'Shop' },
    { id: 'settings-features-students', label: 'Students' },
] as const;

export const INTERFACE_SECTION_NAV = [
    { id: 'settings-interface-language', label: 'Language' },
    { id: 'settings-interface-appearance', label: 'Colors' },
    { id: 'settings-interface-motion', label: 'Motion' },
    { id: 'settings-interface-layout', label: 'Layout' },
] as const;

export const GENERAL_SECTION_NAV = [
    { id: 'settings-general-sessions', label: 'Sessions' },
    { id: 'settings-general-kiosk', label: 'Kiosk' },
    { id: 'settings-general-printing', label: 'Printing' },
    { id: 'settings-general-guidance', label: 'Guidance' },
] as const;

/** Feature toggles exposed in Advanced — only keys that ship today. */
export const IMPLEMENTED_FEATURE_TOGGLE_KEYS = [
    'enableTeacherBudgets',
    'enableClassAccumulations',
    'smartScreenEnabled',
    'bulletinEnabled',
    'enableClassLeaderboard',
    'enablePrizeAiSurprise',
    'enableVendingMachine',
    'enableStudentEmojiOnPrizeTickets',
    'enableStudentWelcomeBackScreen',
    'enableThemeAnimations',
] as const;

/** Admin dashboard tab values (see `AdminDashboardInner` TabsContent). */
export const ADMIN_SETTINGS_TAB_VALUES = new Set([
    'welcome',
    'students',
    'classes',
    'teachers',
    'prizes',
    'categories',
    'notifications',
    'branding',
    'student-portal',
    'displays',
    'library',
    'houses',
    'recess',
    'raffle',
    'attendance',
    'insights',
    'integrations',
    'staff-accounts',
    'reports',
    'bonuspoints',
    'category-badges',
    'goals',
    'coupons',
]);
