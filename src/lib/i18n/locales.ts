export const APP_LOCALES = ['en', 'he'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';

export type LocaleOption = {
  value: AppLocale;
  labelKey: 'settings.language.english' | 'settings.language.hebrew';
  nativeLabel: string;
};

export const LOCALE_OPTIONS: LocaleOption[] = [
  { value: 'en', labelKey: 'settings.language.english', nativeLabel: 'English' },
  { value: 'he', labelKey: 'settings.language.hebrew', nativeLabel: 'עברית' },
];

const LEGACY_LANGUAGE_MAP: Record<string, AppLocale> = {
  english: 'en',
  en: 'en',
  hebrew: 'he',
  he: 'he',
  iw: 'he',
};

/** Normalize stored `settings.language` (legacy display names or BCP-47 codes). */
export function resolveLocaleFromLanguageSetting(language: string | null | undefined): AppLocale {
  const raw = (language ?? '').trim().toLowerCase();
  if (!raw) return DEFAULT_LOCALE;
  return LEGACY_LANGUAGE_MAP[raw] ?? DEFAULT_LOCALE;
}

export function isRtlLocale(locale: AppLocale): boolean {
  return locale === 'he';
}

export function localeHtmlLang(locale: AppLocale): string {
  return locale;
}
