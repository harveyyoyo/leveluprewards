export type NavColorScheme =
  | 'default'
  | 'rainbow'
  | 'sky'
  | 'rose'
  | 'mint'
  | 'lavender'
  | 'peach'
  | 'pastel'
  | 'darkerPastel'
  | 'slate'
  | 'forest'
  | 'ocean'
  | 'sunset'
  | 'berry'
  | 'coral'
  | 'golden'
  | 'indigo'
  | 'sapphire'
  | 'plum'
  | 'tropics';

const PALETTES: Record<NavColorScheme, readonly string[]> = {
  default: [
    // LevelUp navy family — brand primary plus readable blue accents.
    '211 62% 17%',
    '211 58% 22%',
    '211 54% 28%',
    '217 60% 32%',
    '217 56% 38%',
    '199 70% 38%',
    '199 75% 42%',
  ],
  rainbow: [
    '0 84% 60%', // red
    '24 95% 53%', // orange
    '45 93% 47%', // yellow
    '142 71% 45%', // green
    '199 89% 48%', // blue
    '262 83% 58%', // indigo
    '292 84% 61%', // violet
  ],
  sky: [
    '199 89% 48%',
    '205 92% 56%',
    '210 98% 65%',
    '215 95% 72%',
    '220 90% 78%',
    '225 85% 82%',
    '230 80% 86%',
  ],
  rose: [
    '345 82% 62%',
    '338 85% 67%',
    '331 82% 70%',
    '324 78% 73%',
    '317 74% 76%',
    '310 70% 79%',
    '303 66% 82%',
  ],
  mint: [
    '158 55% 55%',
    '154 58% 58%',
    '150 60% 62%',
    '146 58% 66%',
    '142 56% 70%',
    '138 54% 74%',
    '134 52% 78%',
  ],
  lavender: [
    '262 70% 64%',
    '266 68% 68%',
    '270 66% 72%',
    '274 64% 75%',
    '278 62% 78%',
    '282 60% 81%',
    '286 58% 84%',
  ],
  peach: [
    '20 88% 62%',
    '24 86% 66%',
    '28 84% 70%',
    '32 82% 74%',
    '36 80% 78%',
    '40 78% 82%',
    '44 76% 85%',
  ],
  pastel: [
    '340 66% 82%', // pink
    '18 82% 80%', // peach
    '48 84% 80%', // butter
    '138 56% 78%', // mint
    '200 70% 80%', // baby blue
    '258 62% 82%', // lavender
    '292 58% 83%', // lilac
  ],
  darkerPastel: [
    '340 66% 72%', // deeper pink
    '18 82% 70%',  // deeper peach
    '48 84% 70%',  // deeper butter
    '138 56% 68%', // deeper mint
    '200 70% 70%', // deeper baby blue
    '258 62% 72%', // deeper lavender
    '292 58% 73%', // deeper lilac
  ],
  slate: [
    '215 20% 35%',
    '215 18% 32%',
    '215 16% 29%',
    '215 14% 26%',
    '215 12% 23%',
    '215 10% 20%',
    '215 8% 18%',
  ],
  forest: [
    '142 45% 32%',
    '150 40% 28%',
    '158 38% 26%',
    '165 36% 24%',
    '170 34% 22%',
    '175 32% 20%',
    '182 30% 20%',
  ],
  ocean: [
    '192 70% 30%',
    '194 58% 34%',
    '196 50% 38%',
    '190 46% 36%',
    '198 44% 40%',
    '187 42% 34%',
    '201 38% 42%',
  ],
  sunset: [
    '12 66% 55%',
    '18 58% 56%',
    '24 54% 54%',
    '8 56% 52%',
    '28 50% 58%',
    '14 52% 50%',
    '22 48% 56%',
  ],
  berry: [
    '330 65% 50%',
    '320 60% 48%',
    '310 58% 46%',
    '300 56% 44%',
    '290 54% 42%',
    '280 52% 40%',
    '270 50% 38%',
  ],
  coral: [
    // Warm coral family — teal complement lives in CSS accents/charts
    '4 63% 59%',
    '8 56% 58%',
    '12 52% 56%',
    '2 54% 54%',
    '16 48% 60%',
    '6 50% 52%',
    '10 46% 62%',
  ],
  golden: [
    // Analogous warm golds
    '38 92% 50%',  // golden amber
    '32 90% 52%',  // deep gold
    '44 94% 52%',  // warm yellow
    '28 88% 48%',  // burnt gold
    '48 90% 54%',  // sunflower
    '35 86% 46%',  // antique gold
    '52 88% 56%',  // light gold
  ],
  indigo: [
    // Monochromatic indigo
    '234 70% 52%', // true indigo
    '238 68% 56%', // blue-indigo
    '230 72% 48%', // deep indigo
    '242 66% 60%', // violet-indigo
    '226 74% 46%', // navy indigo
    '246 64% 64%', // light indigo
    '234 60% 68%', // soft indigo
  ],
  sapphire: [
    // Blue sapphire family — amber complement lives in CSS accents/charts
    '217 64% 40%',
    '214 56% 44%',
    '221 58% 36%',
    '210 52% 46%',
    '218 54% 42%',
    '224 56% 38%',
    '212 48% 48%',
  ],
  plum: [
    // Plum/purple family — sage complement lives in CSS accents/charts
    '310 50% 48%', // plum
    '305 48% 52%', // light plum
    '315 52% 44%', // deep plum
    '300 46% 56%', // orchid plum
    '308 50% 50%', // true plum
    '318 54% 42%', // wine plum
    '302 44% 58%', // soft plum
  ],
  tropics: [
    // Teal/cyan family — orchid & lime complements live in CSS charts
    '175 70% 42%', // teal
    '180 68% 46%', // cyan-teal
    '170 72% 40%', // deep teal
    '185 66% 48%', // aqua teal
    '178 70% 44%', // true teal
    '168 74% 38%', // forest teal
    '182 64% 50%', // light teal
  ],
} as const;

export const RAINBOW_HSL = PALETTES.rainbow;

const DEFAULT_ORDER = ['admin', 'print', 'redeem', 'prize', 'fame'] as const;

function getPalette(scheme?: NavColorScheme) {
  if (!scheme || !PALETTES[scheme]) return PALETTES.default;
  return PALETTES[scheme];
}

/** Parse `H S% L%` triplets from our palette strings. */
function parseHslParts(t: string): [string, string, string] {
  const parts = t.trim().split(/\s+/);
  if (parts.length < 3) return ['0', '0%', '50%'];
  return [parts[0], parts[1], parts[2]];
}

/**
 * Like `rainbowByIndex`, but uses the hue at `index` while keeping saturation
 * and lightness from the palette anchor (first swatch). Stops 'gradient' themes
 * from washing out items lower in a list (e.g. portal cards).
 */
export function rainbowByIndexUniformLightness(index: number, scheme?: NavColorScheme) {
  const palette = getPalette(scheme);
  const len = palette.length;
  const i = ((index % len) + len) % len;
  const [h] = parseHslParts(palette[i]);
  const [, s, l] = parseHslParts(palette[0]);
  return `hsl(${h} ${s} ${l})`;
}

/** Order used to map portal `area.id` to a theme slot (independent of visible list order). */
const PORTAL_COLOR_ORDER = ['admin', 'print', 'redeem', 'student-home', 'prize', 'fame'] as const;

export function rainbowForPortalId(id: string, scheme?: NavColorScheme) {
  const idx = PORTAL_COLOR_ORDER.indexOf(id as (typeof PORTAL_COLOR_ORDER)[number]);
  return rainbowByIndexUniformLightness(idx === -1 ? 0 : idx, scheme);
}

export function rainbowByIndex(index: number, scheme?: NavColorScheme) {
  const palette = getPalette(scheme);
  return `hsl(${palette[((index % palette.length) + palette.length) % palette.length]})`;
}

export function rainbowTripletByIndex(index: number, scheme?: NavColorScheme) {
  const palette = getPalette(scheme);
  return palette[((index % palette.length) + palette.length) % palette.length];
}

export function rainbowForNavId(id: string, scheme?: NavColorScheme) {
  const idx = DEFAULT_ORDER.indexOf(id as any);
  return rainbowByIndex(idx === -1 ? 0 : idx, scheme);
}

export function rainbowTripletForNavId(id: string, scheme?: NavColorScheme) {
  const idx = DEFAULT_ORDER.indexOf(id as any);
  return rainbowTripletByIndex(idx === -1 ? 0 : idx, scheme);
}

// ── Complement palettes for two‑tone schemes ──────────────────────────
// Each array is parallel to the primary palette (7 entries).
// Schemes not listed here fall back to their primary palette.
const COMPLEMENT_PALETTES: Partial<Record<NavColorScheme, readonly string[]>> = {
  default: [
    // Warm cream/gold complements for LevelUp navy (logo bars + wordmark)
    '41 60% 75%',
    '43 55% 70%',
    '39 58% 72%',
    '45 52% 68%',
    '41 62% 78%',
    '37 54% 74%',
    '43 56% 76%',
  ],
  ocean: [
    // Warm amber/sand complements for ocean blues (dual-tone nav / rings)
    '40 63% 56%',
    '36 54% 54%',
    '43 56% 58%',
    '32 50% 52%',
    '46 58% 60%',
    '38 48% 50%',
    '41 52% 57%',
  ],
  sunset: [
    // Cool indigo complements for sunset warm hues
    '229 30% 50%',
    '225 28% 46%',
    '234 30% 54%',
    '220 32% 48%',
    '238 28% 52%',
    '226 26% 44%',
    '232 30% 56%',
  ],
  coral: [
    // Teal complements for coral primary
    '177 53% 37%',
    '174 46% 39%',
    '181 44% 41%',
    '170 42% 36%',
    '185 46% 43%',
    '172 40% 34%',
    '178 42% 45%',
  ],
  sapphire: [
    // Amber complements for sapphire primary
    '40 70% 48%',
    '36 64% 46%',
    '44 68% 50%',
    '32 60% 44%',
    '48 70% 52%',
    '34 58% 42%',
    '42 64% 54%',
  ],
  plum: [
    // Sage/green complements for plum primary
    '130 40% 46%',
    '126 38% 44%',
    '134 42% 48%',
    '122 36% 42%',
    '138 44% 50%',
    '118 34% 40%',
    '130 40% 52%',
  ],
  tropics: [
    // Warm orchid/pink complements for teal primary
    '295 55% 58%',
    '290 52% 54%',
    '300 50% 60%',
    '285 48% 52%',
    '305 52% 62%',
    '280 46% 50%',
    '295 50% 56%',
  ],
} as const;

function getComplementPalette(scheme?: NavColorScheme) {
  if (scheme && COMPLEMENT_PALETTES[scheme]) return COMPLEMENT_PALETTES[scheme]!;
  // Fall back to the primary palette when no complement is defined
  return getPalette(scheme);
}

export function complementTripletByIndex(index: number, scheme?: NavColorScheme) {
  const palette = getComplementPalette(scheme);
  return palette[((index % palette.length) + palette.length) % palette.length];
}

export function complementForNavId(id: string, scheme?: NavColorScheme) {
  const idx = DEFAULT_ORDER.indexOf(id as any);
  return `hsl(${complementTripletByIndex(idx === -1 ? 0 : idx, scheme)})`;
}

export function complementTripletForNavId(id: string, scheme?: NavColorScheme) {
  const idx = DEFAULT_ORDER.indexOf(id as any);
  return complementTripletByIndex(idx === -1 ? 0 : idx, scheme);
}
