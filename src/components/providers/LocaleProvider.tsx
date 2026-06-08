'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import {
  DEFAULT_LOCALE,
  isRtlLocale,
  localeHtmlLang,
  LOCALE_OPTIONS,
  resolveLocaleFromLanguageSetting,
  type AppLocale,
  type LocaleOption,
} from '@/lib/i18n/locales';
import { getMessages } from '@/lib/i18n/messages';
import { createTranslator, type TranslationParams } from '@/lib/i18n/translate';
import { useSettings } from '@/components/providers/SettingsProvider';

type LocaleContextValue = {
  locale: AppLocale;
  dir: 'ltr' | 'rtl';
  htmlLang: string;
  t: (key: string, params?: TranslationParams) => string;
  localeOptions: LocaleOption[];
  setLocale: (locale: AppLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyDocumentLocale(locale: AppLocale) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const lang = localeHtmlLang(locale);
  const dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
  html.lang = lang;
  html.dir = dir;
  html.dataset.locale = locale;
  html.dataset.dir = dir;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const locale = resolveLocaleFromLanguageSetting(settings.language);
  const messages = useMemo(() => getMessages(locale), [locale]);
  const t = useMemo(() => createTranslator(messages), [messages]);

  const setLocale = useCallback(
    (next: AppLocale) => {
      updateSettings({ language: next });
    },
    [updateSettings],
  );

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: locale || DEFAULT_LOCALE,
      dir: isRtlLocale(locale) ? 'rtl' : 'ltr',
      htmlLang: localeHtmlLang(locale),
      t,
      localeOptions: LOCALE_OPTIONS,
      setLocale,
    }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, locale, dir, setLocale, localeOptions } = useLocale();
  return { t, locale, dir, setLocale, localeOptions };
}
