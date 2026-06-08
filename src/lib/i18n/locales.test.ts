import { describe, expect, it } from 'vitest';
import { resolveLocaleFromLanguageSetting } from '@/lib/i18n/locales';

describe('resolveLocaleFromLanguageSetting', () => {
  it('maps legacy English label and BCP-47 codes', () => {
    expect(resolveLocaleFromLanguageSetting('English')).toBe('en');
    expect(resolveLocaleFromLanguageSetting('en')).toBe('en');
  });

  it('maps Hebrew labels and codes', () => {
    expect(resolveLocaleFromLanguageSetting('Hebrew')).toBe('he');
    expect(resolveLocaleFromLanguageSetting('he')).toBe('he');
    expect(resolveLocaleFromLanguageSetting('iw')).toBe('he');
  });

  it('falls back to English for unknown values', () => {
    expect(resolveLocaleFromLanguageSetting('')).toBe('en');
    expect(resolveLocaleFromLanguageSetting('fr')).toBe('en');
  });
});
