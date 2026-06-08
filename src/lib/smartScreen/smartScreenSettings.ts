import type { Settings } from '@/components/providers/SettingsProvider';

export const SMART_SCREEN_PROFILE_SETTING_KEYS = [
  'smartScreenEnabled',
  'smartScreenTitle',
  'smartScreenMessage',
  'smartScreenTheme',
  'smartScreenLayout',
  'smartScreenLocationZip',
  'smartScreenWeatherLabel',
  'smartScreenWeatherTemp',
  'smartScreenShowWeather',
  'smartScreenShowStats',
  'smartScreenShowCompliments',
  'smartScreenShowFocus',
  'smartScreenShowQuote',
  'smartScreenShowLeaderboard',
  'smartScreenShowHouses',
  'smartScreenShowClasses',
  'smartScreenShowBirthdays',
  'smartScreenShowBulletin',
  'smartScreenShowRewards',
  'smartScreenShowSchedule',
  'smartScreenShowHebrewDate',
  'smartScreenShowJewishHolidays',
] as const;

export type SmartScreenProfileSettingKey = (typeof SMART_SCREEN_PROFILE_SETTING_KEYS)[number];

export type SmartScreenLayout = 'mirror' | 'dashboard' | 'portrait';

export type SmartScreenScopedSettings = Pick<Settings, SmartScreenProfileSettingKey>;

export type SmartScreenSettingsSnapshot = Partial<SmartScreenScopedSettings>;

export function readSmartScreenSetting<K extends SmartScreenProfileSettingKey>(
  key: K,
  schoolSettings: Settings,
  profileSettings?: Partial<Settings>,
  draft?: SmartScreenSettingsSnapshot,
): Settings[K] {
  if (draft && draft[key] !== undefined) return draft[key] as Settings[K];
  if (profileSettings && profileSettings[key] !== undefined) return profileSettings[key] as Settings[K];
  return schoolSettings[key];
}

export function buildSmartScreenSettingsSnapshot(
  schoolSettings: Settings,
  profileSettings?: Partial<Settings>,
): SmartScreenSettingsSnapshot {
  const snapshot: Record<string, any> = {};
  for (const key of SMART_SCREEN_PROFILE_SETTING_KEYS) {
    snapshot[key] = readSmartScreenSetting(key, schoolSettings, profileSettings);
  }
  return snapshot as SmartScreenSettingsSnapshot;
}

export function validSmartScreenLayout(value: string | null | undefined): SmartScreenLayout | null {
  return value === 'mirror' || value === 'dashboard' || value === 'portrait' ? value : null;
}

export function smartScreenSnapshotsEqual(
  a: SmartScreenSettingsSnapshot,
  b: SmartScreenSettingsSnapshot,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
