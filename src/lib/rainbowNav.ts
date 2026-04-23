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
    // Muted/default palette (less colorful)
    '220 35% 52%',
    '210 30% 50%',
    '200 32% 48%',
    '190 28% 46%',
    '230 30% 50%',
    '240 28% 52%',
    '250 26% 54%',
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
    '197 71% 45%',
    '203 68% 42%',
    '208 64% 40%',
    '213 60% 38%',
    '218 56% 36%',
    '223 52% 34%',
    '228 48% 32%',
  ],
  sunset: [
    '14 90% 58%',
    '24 92% 56%',
    '32 93% 54%',
    '40 94% 52%',
    '48 95% 50%',
    '18 88% 54%',
    '28 90% 52%',
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
    '16 85% 60%',  // coral
    '12 80% 58%',  // warm coral
    '20 82% 62%',  // salmon coral
    '8 78% 56%',   // deep coral
    '24 84% 64%',  // peach coral
    '4 76% 54%',   // brick coral
    '16 80% 66%',  // soft coral
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
    '220 75% 48%', // sapphire
    '215 72% 52%', // light sapphire
    '225 78% 44%', // deep sapphire
    '210 70% 56%', // sky sapphire
    '218 74% 50%', // true sapphire
    '228 76% 46%', // navy sapphire
    '212 68% 58%', // soft sapphire
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
  coral: [
    // Teal complements for coral primary
    '196 70% 48%',
    '192 68% 46%',
    '200 72% 50%',
    '188 66% 44%',
    '204 74% 52%',
    '184 64% 42%',
    '196 68% 54%',
  ],
  sapphire: [
    // Amber complements for sapphire primary
    '40 90% 52%',
    '36 88% 50%',
    '44 92% 54%',
    '32 86% 48%',
    '48 94% 56%',
    '28 84% 46%',
    '40 88% 58%',
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
