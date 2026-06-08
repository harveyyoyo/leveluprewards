import type { TranslationParams } from '@/lib/i18n/translate';

export function resolveLabel(
  t: (key: string, params?: TranslationParams) => string,
  key: string,
  fallback: string,
  params?: TranslationParams,
): string {
  const translated = t(key, params);
  return translated === key ? fallback : translated;
}
