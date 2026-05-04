/**
 * Theme contrast helpers — ensure student/custom themes always produce
 * readable text/background pairings.
 *
 * All math follows WCAG 2.x: relative luminance in linear RGB, then
 * contrast ratio `(L1 + 0.05) / (L2 + 0.05)` where L1 is the lighter of
 * the two.
 *
 *   - 4.5  = WCAG AA for normal text
 *   - 3.0  = WCAG AA for large/bold text and UI components
 *
 * The public entry point is `normalizeStudentTheme(theme)` which takes
 * a raw (possibly AI-generated, possibly hand-picked) theme and returns
 * a copy guaranteed to be readable across the surfaces we use it on:
 * page background, card background, and primary/accent chips.
 */
import type { StudentTheme } from './types';

const BLACK = '#020617';
const WHITE = '#ffffff';

function clampHex(hex: string | undefined | null): string | null {
  if (!hex || typeof hex !== 'string') return null;
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let v = m[1];
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  return `#${v.toLowerCase()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = clampHex(hex);
  if (!h) return null;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function channelLum(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * channelLum(rgb.r) + 0.7152 * channelLum(rgb.g) + 0.0722 * channelLum(rgb.b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [L1, L2] = la > lb ? [la, lb] : [lb, la];
  return (L1 + 0.05) / (L2 + 0.05);
}

/** Pick black or white — whichever has more contrast against `bg`. */
export function pickReadableOn(bg: string): string {
  return contrastRatio(WHITE, bg) >= contrastRatio(BLACK, bg) ? WHITE : BLACK;
}

// --- HSL conversion for lightness-based contrast adjustment ---
function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}
function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/**
 * Adjust `fg` toward darker or lighter (preserving hue & saturation)
 * until it reaches `minRatio` contrast against `bg`. If unreachable
 * while preserving hue, falls back to pure black or pure white —
 * whichever gets closer.
 */
export function ensureContrast(fg: string, bg: string, minRatio = 4.5): string {
  const currentRatio = contrastRatio(fg, bg);
  if (currentRatio >= minRatio) return clampHex(fg) || fg;
  const rgb = hexToRgb(fg);
  if (!rgb) return pickReadableOn(bg);
  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const bgLum = relativeLuminance(bg);

  // Try both directions; pick whichever hits the target first, or the
  // better of the two when neither does.
  const step = 0.02;
  let bestFg = fg;
  let bestRatio = currentRatio;
  const tryDirection = (goDarker: boolean) => {
    let l = rgbToHsl(rgb.r, rgb.g, rgb.b).l;
    for (let i = 0; i < 50; i++) {
      l = goDarker ? l - step : l + step;
      if (l <= 0 || l >= 1) break;
      const { r, g, b } = hslToRgb(h, s, l);
      const cand = rgbToHex(r, g, b);
      const r2 = contrastRatio(cand, bg);
      if (r2 > bestRatio) {
        bestRatio = r2;
        bestFg = cand;
      }
      if (r2 >= minRatio) return cand;
    }
    return null;
  };
  // If the background is dark, lighten first; if light, darken first.
  const first = bgLum < 0.5 ? tryDirection(false) : tryDirection(true);
  if (first) return first;
  const second = bgLum < 0.5 ? tryDirection(true) : tryDirection(false);
  if (second) return second;
  // Hue-preserving adjustment couldn't hit the target — fall back to
  // pure black or white (always wins on contrast).
  return pickReadableOn(bg);
}

/**
 * Extract any `#rrggbb` / `#rgb` hex colors present in a CSS
 * background value (`linear-gradient(...)`, `radial-gradient(...)`,
 * solid hex, etc.). Used as a best-effort sample of what the custom
 * background actually looks like.
 */
function sampleHexesFromBackground(style: string | null | undefined): string[] {
  if (!style) return [];
  const matches = style.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi) || [];
  return matches.map((m) => clampHex(m)).filter((x): x is string => !!x);
}

/**
 * Returns a StudentTheme with guaranteed-readable colors.
 *
 *  - `text` ≥ 4.5:1 against the worst of {background, cardBackground,
 *    and any hex colors sampled from backgroundStyle}.
 *  - `primary` ≥ 3:1 against cardBackground (for colored titles/icons
 *    that sit on the card).
 *  - `accent`  ≥ 3:1 against cardBackground.
 *
 * Missing / invalid hex values are left alone (the consumer already
 * falls back to the site theme); this function only *tightens* the
 * existing palette, it never invents colors out of thin air.
 */
export function normalizeStudentTheme(
  theme: StudentTheme | null | undefined,
): StudentTheme | undefined {
  if (!theme) return undefined;

  const bg = clampHex(theme.background) || BLACK;
  const card = clampHex(theme.cardBackground) || bg;
  const bgSamples = sampleHexesFromBackground(theme.backgroundStyle);
  const surfaces = [bg, card, ...bgSamples];

  const worstContrast = (fg: string) =>
    surfaces.reduce((min, s) => Math.min(min, contrastRatio(fg, s)), Infinity);

  const out: StudentTheme = { ...theme };

  // --- text: needs to read over every surface the text renders on ---
  const currentText = clampHex(theme.text);
  const textOk = currentText && worstContrast(currentText) >= 4.5;
  if (!textOk) {
    // Try to preserve the intended hue if we have one; otherwise pick B/W.
    const startingHex = currentText || pickReadableOn(card);
    // Pick the surface with the *worst* contrast as the one to optimize
    // against — that's the binding constraint.
    const bindingSurface = surfaces.reduce(
      (worst, s) => (contrastRatio(startingHex, s) < contrastRatio(startingHex, worst) ? s : worst),
      card,
    );
    let candidate = ensureContrast(startingHex, bindingSurface, 4.5);
    // If that candidate still fails against some other surface, fall back
    // to a black/white that maximizes the worst-case ratio.
    if (worstContrast(candidate) < 4.5) {
      const whiteMin = Math.min(...surfaces.map((s) => contrastRatio(WHITE, s)));
      const blackMin = Math.min(...surfaces.map((s) => contrastRatio(BLACK, s)));
      candidate = whiteMin >= blackMin ? WHITE : BLACK;
    }
    out.text = candidate;
  }

  // --- primary: used for titles/icons on the card & as button bg ---
  const primary = clampHex(theme.primary);
  if (primary && contrastRatio(primary, card) < 3.0) {
    out.primary = ensureContrast(primary, card, 3.0);
  }

  // --- accent: same constraint as primary ---
  const accent = clampHex(theme.accent);
  if (accent && contrastRatio(accent, card) < 3.0) {
    out.accent = ensureContrast(accent, card, 3.0);
  }

  return out;
}

/**
 * Per-student theme wins; otherwise the school default from admin settings.
 * Result is always contrast-normalized for rendering.
 *
 * @param studentThemesEnabled When `false`, returns `undefined` so UI uses standard styling; stored themes are unchanged.
 */
export function resolveStudentThemeWithSchoolDefault(
  studentTheme: StudentTheme | null | undefined,
  schoolDefault: StudentTheme | null | undefined,
  studentThemesEnabled: boolean = true,
): StudentTheme | undefined {
  if (!studentThemesEnabled) return undefined;
  return normalizeStudentTheme(studentTheme ?? schoolDefault ?? undefined);
}

/**
 * Foreground color that reads on top of the theme's primary button.
 * Always returns hex so it can be set as an inline `color` without
 * depending on CSS variables.
 */
export function primaryForegroundFor(theme: StudentTheme | null | undefined): string {
  const p = clampHex(theme?.primary) || BLACK;
  return pickReadableOn(p);
}
