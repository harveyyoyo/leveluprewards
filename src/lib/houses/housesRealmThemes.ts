/**
 * Visual themes for the Houses realm (background, glow, stars, accent gradient).
 *
 * These are presentation-only color palettes for the dedicated Houses experience.
 * Several themes are tuned to pair with a house preset pack from `housePresets.ts`
 * (e.g. the Arena theme matches the "Sports teams" pack) so a school's realm can
 * echo the kind of houses they run — but any theme works with any houses.
 *
 * Themes apply by setting `--hr-*` custom properties (see `globals.css`).
 * Each theme has a `tone` of `dark` or `light` so chrome/text can follow the backdrop.
 */

export const HOUSES_REALM_THEME_IDS = [
  'cosmic',
  'royal',
  'arena',
  'elements',
  'scroll',
  'ocean',
  'sunset',
  'forest',
  'daylight',
  'parchment',
  'lagoon',
  'blossom',
] as const;

export type HousesRealmThemeId = (typeof HOUSES_REALM_THEME_IDS)[number];

export const DEFAULT_HOUSES_REALM_THEME: HousesRealmThemeId = 'daylight';

type HousesRealmThemeTokens = {
  /** Page background-color (solid fallback behind the gradient layers). */
  base: string;
  /** Upper radial glow. */
  glowTop: string;
  /** Lower radial glow (secondary accent). */
  glowBottom: string;
  /** Linear gradient stops, top → bottom. */
  gradFrom: string;
  gradMid: string;
  gradTo: string;
  /** Starfield / sparkle dot color. */
  star: string;
  /** Accent gradient (logo badge, primary CTA). */
  accentFrom: string;
  accentTo: string;
  /** Eyebrow / link accent text color. */
  accentText: string;
  /** Text color that sits on top of the accent gradient. */
  onAccent: string;
  /** Primary readable text on the realm backdrop. */
  fg: string;
  /** Secondary / muted text. */
  muted: string;
  /** Card / panel fill. */
  panel: string;
  /** Header / toolbar fill. */
  chrome: string;
  /** Hairline borders on chrome and panels. */
  border: string;
  /** Form field fill (selects/inputs) — always high contrast vs panel. */
  field: string;
  /** Form field text / icon color. */
  fieldFg: string;
};

export type HousesRealmTheme = {
  id: HousesRealmThemeId;
  label: string;
  description: string;
  /** Emoji shown on the picker chip. */
  icon: string;
  /** Whether the backdrop is dark-night or bright-day. */
  tone: 'dark' | 'light';
  /** Human label of the house preset pack this theme is tuned for, if any. */
  pairs?: string;
  tokens: HousesRealmThemeTokens;
};

const DARK_INK = {
  fg: '#f8f4ff',
  muted: 'rgba(248, 244, 255, 0.78)',
  panel: 'rgba(15, 23, 42, 0.72)',
  chrome: 'rgba(0, 0, 0, 0.45)',
  border: 'rgba(255, 255, 255, 0.18)',
  /** Light “paper” fields so select values stay readable on dark sheets. */
  field: 'rgba(255, 252, 248, 0.96)',
  fieldFg: '#1a1228',
} as const;

const LIGHT_FIELD = {
  field: '#ffffff',
  fieldFg: '#0f172a',
} as const;

export const HOUSES_REALM_THEMES: HousesRealmTheme[] = [
  {
    id: 'cosmic',
    label: 'Cosmic',
    description: 'Violet nebula with amber sparks.',
    icon: '✨',
    tone: 'dark',
    pairs: 'Quick demo',
    tokens: {
      base: '#12081f',
      glowTop: 'rgba(139, 92, 246, 0.35)',
      glowBottom: 'rgba(245, 158, 11, 0.12)',
      gradFrom: '#1a0f2e',
      gradMid: '#12081f',
      gradTo: '#0a0612',
      star: 'rgba(255, 255, 255, 0.35)',
      accentFrom: '#fbbf24',
      accentTo: '#7c3aed',
      accentText: '#fde68a',
      onAccent: '#1a0f2e',
      ...DARK_INK,
    },
  },
  {
    id: 'royal',
    label: 'Royal',
    description: 'Deep sapphire and ceremonial gold.',
    icon: '👑',
    tone: 'dark',
    pairs: 'Classic virtues',
    tokens: {
      base: '#0a1228',
      glowTop: 'rgba(37, 99, 235, 0.32)',
      glowBottom: 'rgba(202, 138, 4, 0.16)',
      gradFrom: '#14224a',
      gradMid: '#0c1632',
      gradTo: '#070b1c',
      star: 'rgba(255, 244, 214, 0.42)',
      accentFrom: '#fcd34d',
      accentTo: '#1d4ed8',
      accentText: '#fde68a',
      onAccent: '#0a1228',
      ...DARK_INK,
    },
  },
  {
    id: 'arena',
    label: 'Arena',
    description: 'Stadium crimson against midnight navy.',
    icon: '🏆',
    tone: 'dark',
    pairs: 'Sports teams',
    tokens: {
      base: '#0a0f1f',
      glowTop: 'rgba(220, 38, 38, 0.30)',
      glowBottom: 'rgba(37, 99, 235, 0.18)',
      gradFrom: '#1a1330',
      gradMid: '#0e0a1c',
      gradTo: '#070510',
      star: 'rgba(255, 226, 226, 0.40)',
      accentFrom: '#f87171',
      accentTo: '#1e3a8a',
      accentText: '#fecaca',
      onAccent: '#0a0f1f',
      ...DARK_INK,
    },
  },
  {
    id: 'elements',
    label: 'Elements',
    description: 'Emerald and sky aurora.',
    icon: '🌿',
    tone: 'dark',
    pairs: 'Four elements',
    tokens: {
      base: '#04130f',
      glowTop: 'rgba(16, 185, 129, 0.30)',
      glowBottom: 'rgba(14, 165, 233, 0.18)',
      gradFrom: '#07231c',
      gradMid: '#04130f',
      gradTo: '#020a08',
      star: 'rgba(180, 255, 220, 0.42)',
      accentFrom: '#34d399',
      accentTo: '#0284c7',
      accentText: '#a7f3d0',
      onAccent: '#04130f',
      ...DARK_INK,
    },
  },
  {
    id: 'scroll',
    label: 'Scroll',
    description: 'Warm parchment glow with navy and gold.',
    icon: '📜',
    tone: 'dark',
    pairs: 'Yeshiva middot',
    tokens: {
      base: '#15110a',
      glowTop: 'rgba(202, 138, 4, 0.28)',
      glowBottom: 'rgba(30, 58, 138, 0.18)',
      gradFrom: '#241a0e',
      gradMid: '#15110a',
      gradTo: '#0b0805',
      star: 'rgba(255, 240, 200, 0.42)',
      accentFrom: '#fcd34d',
      accentTo: '#1e3a8a',
      accentText: '#fde9b8',
      onAccent: '#15110a',
      ...DARK_INK,
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep teal currents and cyan light.',
    icon: '🌊',
    tone: 'dark',
    tokens: {
      base: '#06131c',
      glowTop: 'rgba(14, 165, 233, 0.32)',
      glowBottom: 'rgba(8, 145, 178, 0.18)',
      gradFrom: '#0a2230',
      gradMid: '#06131c',
      gradTo: '#030b12',
      star: 'rgba(200, 240, 255, 0.42)',
      accentFrom: '#38bdf8',
      accentTo: '#0e7490',
      accentText: '#bae6fd',
      onAccent: '#06131c',
      ...DARK_INK,
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'Rose and ember dusk.',
    icon: '🌅',
    tone: 'dark',
    tokens: {
      base: '#1a0a14',
      glowTop: 'rgba(236, 72, 153, 0.30)',
      glowBottom: 'rgba(249, 115, 22, 0.18)',
      gradFrom: '#2a1020',
      gradMid: '#1a0a14',
      gradTo: '#0f060c',
      star: 'rgba(255, 220, 235, 0.42)',
      accentFrom: '#fb7185',
      accentTo: '#f97316',
      accentText: '#fecdd3',
      onAccent: '#1a0a14',
      ...DARK_INK,
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Pine canopy and meadow green.',
    icon: '🌲',
    tone: 'dark',
    tokens: {
      base: '#08140d',
      glowTop: 'rgba(34, 197, 94, 0.28)',
      glowBottom: 'rgba(132, 204, 22, 0.16)',
      gradFrom: '#0d2417',
      gradMid: '#08140d',
      gradTo: '#040b07',
      star: 'rgba(210, 255, 220, 0.42)',
      accentFrom: '#4ade80',
      accentTo: '#15803d',
      accentText: '#bbf7d0',
      onAccent: '#08140d',
      ...DARK_INK,
    },
  },
  {
    id: 'daylight',
    label: 'Daylight',
    description: 'Bright sky blue for daytime assemblies.',
    icon: '☀️',
    tone: 'light',
    tokens: {
      base: '#e8f1fb',
      glowTop: 'rgba(56, 189, 248, 0.45)',
      glowBottom: 'rgba(251, 191, 36, 0.22)',
      gradFrom: '#f4f9ff',
      gradMid: '#e4eef9',
      gradTo: '#d5e4f4',
      star: 'rgba(37, 99, 235, 0.18)',
      accentFrom: '#0ea5e9',
      accentTo: '#2563eb',
      accentText: '#1d4ed8',
      onAccent: '#ffffff',
      fg: '#0f1b2d',
      muted: 'rgba(15, 27, 45, 0.72)',
      panel: 'rgba(255, 255, 255, 0.86)',
      chrome: 'rgba(255, 255, 255, 0.78)',
      border: 'rgba(15, 27, 45, 0.14)',
      ...LIGHT_FIELD,
    },
  },
  {
    id: 'parchment',
    label: 'Parchment',
    description: 'Sunlit cream paper with gold ink.',
    icon: '🪶',
    tone: 'light',
    pairs: 'Yeshiva middot',
    tokens: {
      base: '#f6edd8',
      glowTop: 'rgba(245, 158, 11, 0.28)',
      glowBottom: 'rgba(30, 64, 175, 0.10)',
      gradFrom: '#fbf6ea',
      gradMid: '#f3e6cc',
      gradTo: '#e8d5ae',
      star: 'rgba(120, 80, 20, 0.16)',
      accentFrom: '#d97706',
      accentTo: '#1e3a8a',
      accentText: '#92400e',
      onAccent: '#fff7ed',
      fg: '#2a1c0c',
      muted: 'rgba(42, 28, 12, 0.72)',
      panel: 'rgba(255, 252, 245, 0.90)',
      chrome: 'rgba(255, 250, 240, 0.84)',
      border: 'rgba(90, 60, 20, 0.16)',
      field: '#fffdf8',
      fieldFg: '#2a1c0c',
    },
  },
  {
    id: 'lagoon',
    label: 'Lagoon',
    description: 'Clear tropical water and seafoam.',
    icon: '🏝️',
    tone: 'light',
    tokens: {
      base: '#dff7f3',
      glowTop: 'rgba(45, 212, 191, 0.40)',
      glowBottom: 'rgba(56, 189, 248, 0.22)',
      gradFrom: '#f0fffc',
      gradMid: '#d8f5ef',
      gradTo: '#c5ebe3',
      star: 'rgba(13, 148, 136, 0.18)',
      accentFrom: '#14b8a6',
      accentTo: '#0284c7',
      accentText: '#0f766e',
      onAccent: '#ffffff',
      fg: '#0b2a28',
      muted: 'rgba(11, 42, 40, 0.72)',
      panel: 'rgba(255, 255, 255, 0.86)',
      chrome: 'rgba(255, 255, 255, 0.78)',
      border: 'rgba(11, 42, 40, 0.14)',
      ...LIGHT_FIELD,
    },
  },
  {
    id: 'blossom',
    label: 'Blossom',
    description: 'Soft spring petals and warm rose.',
    icon: '🌸',
    tone: 'light',
    tokens: {
      base: '#fceef4',
      glowTop: 'rgba(244, 114, 182, 0.32)',
      glowBottom: 'rgba(251, 146, 60, 0.16)',
      gradFrom: '#fff7fb',
      gradMid: '#f9e4ee',
      gradTo: '#f0d4e2',
      star: 'rgba(190, 24, 93, 0.16)',
      accentFrom: '#ec4899',
      accentTo: '#f97316',
      accentText: '#be185d',
      onAccent: '#ffffff',
      fg: '#2a1020',
      muted: 'rgba(42, 16, 32, 0.72)',
      panel: 'rgba(255, 255, 255, 0.88)',
      chrome: 'rgba(255, 255, 255, 0.80)',
      border: 'rgba(42, 16, 32, 0.14)',
      ...LIGHT_FIELD,
    },
  },
];

const THEME_BY_ID = new Map(HOUSES_REALM_THEMES.map((t) => [t.id, t]));

export function resolveHousesRealmTheme(
  value: string | null | undefined,
): HousesRealmTheme {
  return THEME_BY_ID.get(value as HousesRealmThemeId) ?? THEME_BY_ID.get(DEFAULT_HOUSES_REALM_THEME)!;
}

/** CSS custom properties (`--hr-*`) for a theme — set on `documentElement` or a wrapper style. */
export function housesRealmThemeVars(theme: HousesRealmTheme): Record<string, string> {
  const t = theme.tokens;
  return {
    '--hr-base': t.base,
    '--hr-glow-top': t.glowTop,
    '--hr-glow-bottom': t.glowBottom,
    '--hr-grad-from': t.gradFrom,
    '--hr-grad-mid': t.gradMid,
    '--hr-grad-to': t.gradTo,
    '--hr-star': t.star,
    '--hr-accent-from': t.accentFrom,
    '--hr-accent-to': t.accentTo,
    '--hr-accent-text': t.accentText,
    '--hr-on-accent': t.onAccent,
    '--hr-fg': t.fg,
    '--hr-muted': t.muted,
    '--hr-panel': t.panel,
    '--hr-chrome': t.chrome,
    '--hr-border': t.border,
    '--hr-field': t.field,
    '--hr-field-fg': t.fieldFg,
  };
}
