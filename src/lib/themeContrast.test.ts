import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  ensureContrast,
  normalizeStudentTheme,
  pickReadableOn,
  primaryForegroundFor,
  resolveStudentThemeWithSchoolDefault,
} from './themeContrast';

describe('contrastRatio', () => {
  it('returns 21 for pure black on pure white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });
  it('is symmetric', () => {
    expect(contrastRatio('#123456', '#fedcba')).toBeCloseTo(
      contrastRatio('#fedcba', '#123456'),
      5,
    );
  });
  it('flags low-contrast pairs', () => {
    expect(contrastRatio('#cccccc', '#ffffff')).toBeLessThan(2);
  });
});

describe('pickReadableOn', () => {
  it('picks white on dark bg', () => {
    expect(pickReadableOn('#1a1a2e')).toBe('#ffffff');
  });
  it('picks black-ish on light bg', () => {
    expect(pickReadableOn('#f5f5f5')).toBe('#020617');
  });
});

describe('ensureContrast', () => {
  it('leaves colors that already have >=4.5 contrast alone', () => {
    const fg = '#111111';
    const bg = '#ffffff';
    expect(ensureContrast(fg, bg, 4.5)).toBe(fg);
  });
  it('darkens a light foreground against a white background to meet AA', () => {
    const out = ensureContrast('#eeeeee', '#ffffff', 4.5);
    expect(contrastRatio(out, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
  it('lightens a dark foreground against a black background to meet AA', () => {
    const out = ensureContrast('#222222', '#000000', 4.5);
    expect(contrastRatio(out, '#000000')).toBeGreaterThanOrEqual(4.5);
  });
  it('falls back to B/W when hue-preserving adjustment is insufficient', () => {
    // Yellow on white is famously hard to fix without losing hue.
    const out = ensureContrast('#ffff00', '#ffffff', 7);
    expect(contrastRatio(out, '#ffffff')).toBeGreaterThanOrEqual(7);
  });
});

describe('normalizeStudentTheme', () => {
  it('returns undefined for an undefined theme', () => {
    expect(normalizeStudentTheme(undefined)).toBeUndefined();
  });

  it('fixes unreadable text against a dark background', () => {
    const out = normalizeStudentTheme({
      background: '#0b0b24',
      text: '#222222', // ~unreadable on near-black
      primary: '#6366f1',
      cardBackground: '#151530',
      accent: '#8b5cf6',
    })!;
    expect(contrastRatio(out.text, '#0b0b24')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(out.text, '#151530')).toBeGreaterThanOrEqual(4.5);
  });

  it('fixes unreadable text against a light card even when page bg is dark', () => {
    const out = normalizeStudentTheme({
      background: '#0b0b24',
      text: '#ffffff',
      primary: '#0ea5e9',
      cardBackground: '#ffffff',
      accent: '#22c55e',
    })!;
    // white-on-white card is the binding constraint — should be adjusted
    expect(contrastRatio(out.text, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('samples hex colors out of a CSS gradient background', () => {
    const out = normalizeStudentTheme({
      background: '#222222',
      backgroundStyle: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
      text: '#cccccc', // fine on #222, awful on #ffffff
      primary: '#ff0099',
      cardBackground: '#222222',
      accent: '#00ffcc',
    })!;
    expect(contrastRatio(out.text, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('bumps a low-contrast primary against the card', () => {
    const out = normalizeStudentTheme({
      background: '#ffffff',
      text: '#111111',
      primary: '#f5f5f5', // invisible on white card
      cardBackground: '#ffffff',
      accent: '#eeeeee',
    })!;
    expect(contrastRatio(out.primary, '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(out.accent, '#ffffff')).toBeGreaterThanOrEqual(3);
  });

  it('leaves a well-formed theme essentially unchanged', () => {
    const input = {
      background: '#0f172a',
      text: '#f8fafc',
      primary: '#0ea5e9',
      cardBackground: '#1e293b',
      accent: '#22c55e',
    };
    const out = normalizeStudentTheme(input)!;
    expect(out.text).toBe(input.text);
    expect(out.primary).toBe(input.primary);
    expect(out.accent).toBe(input.accent);
  });
});

describe('resolveStudentThemeWithSchoolDefault', () => {
  const school = {
    background: '#0f172a',
    text: '#f8fafc',
    primary: '#38bdf8',
    cardBackground: '#1e293b',
    accent: '#a78bfa',
  };

  it('prefers the student theme when both exist', () => {
    const student = { ...school, primary: '#ef4444' };
    const out = resolveStudentThemeWithSchoolDefault(student, school)!;
    expect(out.primary).toBe('#ef4444');
  });

  it('falls back to school default when student has no theme', () => {
    const out = resolveStudentThemeWithSchoolDefault(undefined, school)!;
    expect(out.primary).toBe(school.primary);
  });

  it('returns undefined when neither is set', () => {
    expect(resolveStudentThemeWithSchoolDefault(undefined, undefined)).toBeUndefined();
  });

  it('returns undefined when student themes are disabled (data ignored, not erased)', () => {
    expect(resolveStudentThemeWithSchoolDefault(undefined, school, false)).toBeUndefined();
    expect(resolveStudentThemeWithSchoolDefault(school, undefined, false)).toBeUndefined();
  });
});

describe('primaryForegroundFor', () => {
  it('returns white for a dark primary', () => {
    expect(primaryForegroundFor({ primary: '#1e293b' } as any)).toBe('#ffffff');
  });
  it('returns near-black for a light primary', () => {
    expect(primaryForegroundFor({ primary: '#fde047' } as any)).toBe('#020617');
  });
});
