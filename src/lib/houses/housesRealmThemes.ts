/**
 * Visual themes for the Houses realm (background, glow, stars, accent gradient).
 *
 * These are presentation-only color palettes for the dedicated Houses experience.
 * Several themes are tuned to pair with a house preset pack from `housePresets.ts`
 * (e.g. the Arena theme matches the "Sports teams" pack) so a school's realm can
 * echo the kind of houses they run — but any theme works with any houses.
 *
 * Themes apply by setting `--hr-*` custom properties (see `globals.css`).
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
] as const;

export type HousesRealmThemeId = (typeof HOUSES_REALM_THEME_IDS)[number];

export const DEFAULT_HOUSES_REALM_THEME: HousesRealmThemeId = 'cosmic';

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
  /** Starfield dot color. */
  star: string;
  /** Accent gradient (logo badge, primary CTA). */
  accentFrom: string;
  accentTo: string;
  /** Eyebrow / link accent text color. */
  accentText: string;
  /** Text color that sits on top of the accent gradient. */
  onAccent: string;
};

export type HousesRealmTheme = {
  id: HousesRealmThemeId;
  label: string;
  description: string;
  /** Emoji shown on the picker chip. */
  icon: string;
  /** Human label of the house preset pack this theme is tuned for, if any. */
  pairs?: string;
  tokens: HousesRealmThemeTokens;
};

export const HOUSES_REALM_THEMES: HousesRealmTheme[] = [
  {
    id: 'cosmic',
    label: 'Cosmic',
    description: 'Violet nebula with amber sparks.',
    icon: '✨',
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
    },
  },
  {
    id: 'royal',
    label: 'Royal',
    description: 'Deep sapphire and ceremonial gold.',
    icon: '👑',
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
    },
  },
  {
    id: 'arena',
    label: 'Arena',
    description: 'Stadium crimson against midnight navy.',
    icon: '🏆',
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
    },
  },
  {
    id: 'elements',
    label: 'Elements',
    description: 'Emerald and sky aurora.',
    icon: '🌿',
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
    },
  },
  {
    id: 'scroll',
    label: 'Scroll',
    description: 'Warm parchment glow with navy and gold.',
    icon: '📜',
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
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep teal currents and cyan light.',
    icon: '🌊',
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
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'Rose and ember dusk.',
    icon: '🌅',
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
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Pine canopy and meadow green.',
    icon: '🌲',
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
  };
}
