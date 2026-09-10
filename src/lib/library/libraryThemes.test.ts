import { describe, expect, it } from 'vitest';
import {
  LIBRARY_THEME_IDS,
  LIBRARY_THEMES,
  DEFAULT_LIBRARY_THEME,
  resolveLibraryTheme,
} from './libraryThemes';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  const lightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (lightest + 0.05) / (darkest + 0.05);
}

describe('libraryThemes', () => {
  it('resolves default theme when null or undefined', () => {
    expect(resolveLibraryTheme(null).id).toBe(DEFAULT_LIBRARY_THEME);
    expect(resolveLibraryTheme(undefined).id).toBe(DEFAULT_LIBRARY_THEME);
    expect(resolveLibraryTheme('non-existent-theme').id).toBe(DEFAULT_LIBRARY_THEME);
  });

  it('resolves each theme by id', () => {
    for (const id of LIBRARY_THEME_IDS) {
      const theme = resolveLibraryTheme(id);
      expect(theme.id).toBe(id);
      expect(theme.label).toBeTruthy();
      expect(theme.classes.wrapper).toBeTruthy();
    }
  });

  it('satisfies WCAG AA contrast (>= 4.5:1) between text and background', () => {
    for (const id of LIBRARY_THEME_IDS) {
      const theme = LIBRARY_THEMES[id];
      const contrast = getContrast(theme.swatches.text, theme.swatches.bg);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('provides style categories and look-and-feel uiClasses for every theme', () => {
    const validStyles = new Set(['fun', 'pro', 'classic', 'cyber']);
    for (const id of LIBRARY_THEME_IDS) {
      const theme = LIBRARY_THEMES[id];
      expect(validStyles.has(theme.styleCategory)).toBe(true);
      expect(theme.styleName).toBeTruthy();
      expect(theme.uiClasses.cardRadius).toMatch(/^rounded-/);
      expect(theme.uiClasses.buttonRadius).toMatch(/^rounded-/);
      expect(theme.uiClasses.badgeRadius).toContain('rounded-');
      expect(theme.uiClasses.greeting).toBeTruthy();
    }
  });
});
