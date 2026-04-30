import { cn } from '@/lib/utils';

/** Matches `AnimatedSiteBackground` visibility (SettingsProvider + Legacy mode + Calm mode). */
export function globalAnimatedBackdropActive(settings: {
  enableAnimatedBackground: boolean;
  legacyMode: boolean;
  calmMode?: boolean;
}): boolean {
  if (settings.calmMode) return false;
  return Boolean(settings.enableAnimatedBackground && !settings.legacyMode);
}

export const ANIMATED_BACKGROUND_STYLES = [
  { id: 'classroom', label: 'Classroom', description: 'Chalkboard feel, soft grid & school icons' },
  { id: 'campus', label: 'Campus sky', description: 'Bright blues, clouds & daylight energy' },
  { id: 'study_hall', label: 'Study hall', description: 'Warm paper, wood tones & reading light' },
  { id: 'science_lab', label: 'Science lab', description: 'Teal glows & glassware sparkle' },
  { id: 'art_studio', label: 'Art studio', description: 'Paint-splash color washes & palette' },
  { id: 'field_day', label: 'Field day', description: 'Turf greens, sun wash & medals' },
  { id: 'midnight_study', label: 'Midnight study', description: 'Deep indigo, moonlight & quiet stars' },
  { id: 'ocean_breeze', label: 'Ocean breeze', description: 'Cool teal & blue horizontal calm' },
  { id: 'aurora', label: 'Aurora calm', description: 'Gentle drifting glows — easy on the eyes' },
  { id: 'arcade', label: 'Arcade', description: 'Game icons & classic arcade sparkle wash' },
  { id: 'celebration', label: 'Celebration', description: 'Confetti motion & party colors' },
  { id: 'trophy_glow', label: 'Trophy glow', description: 'Gold shine, sparkles & winner vibe' },
  { id: 'prize_burst', label: 'Prize burst', description: 'Bold reward colors & high-energy wash' },
  { id: 'candy_rush', label: 'Candy rush', description: 'Sweet pinks, mint & gift-box cheer' },
  { id: 'rainbow_pop', label: 'Rainbow pop', description: 'Arced chart colors & sticker dots' },
  { id: 'points_bank', label: 'Points bank', description: 'Gold coin shine & star points — like the scoreboard' },
  { id: 'prize_booth', label: 'Prize booth', description: 'Vouchers, gifts & coupon-redemption energy' },
  { id: 'hall_of_fame', label: 'Hall of fame', description: 'Royal purple & gold spotlight for top earners' },
  { id: 'badge_wall', label: 'Badge wall', description: 'Achievement ribbons & milestone colors' },
  { id: 'attendance_streak', label: 'Attendance streak', description: 'Fresh greens & check-in calm for daily wins' },
  { id: 'reward_mega', label: 'Reward mega-mix', description: 'All app reward themes blended — points, prizes, fame, badges & attendance' },
  { id: 'sunrise_rays', label: 'Sunrise rays', description: 'Slow rotating color wheel from the horizon — no blobs or icons' },
  { id: 'halftone_dots', label: 'Halftone dots', description: 'Print-style dot screen & soft vignette' },
  { id: 'diagonal_stripes', label: 'Diagonal stripes', description: 'Bold repeating bands — poster / voucher-stub energy' },
  { id: 'bokeh_field', label: 'Bokeh field', description: 'Dozens of drifting blurred discs — camera-lens sparkle' },
  { id: 'contour_lines', label: 'Contour map', description: 'Layered horizontal “topo” lines — chart-tinted ink' },
  { id: 'neon_arcade', label: 'Neon arcade', description: 'Electric cyan, magenta & violet — loud glows & big motion' },
  { id: 'hyperwave', label: 'Hyperwave', description: 'Saturated stripes & chart blobs — high-energy drift' },
  { id: 'solar_flare', label: 'Solar flare', description: 'Hot gold, orange & red — bright “spotlight” center' },
  { id: 'chroma_spin', label: 'Chroma spin', description: 'Fast rainbow wheel + bold color washes — very visible' },
  { id: 'silly_string', label: 'Silly string attack', description: 'Neon streamers & confetti chaos — hall-pass not required' },
  { id: 'glitter_goblin', label: 'Glitter goblin', description: 'Unhinged sparkles & “friendly” purple blobs' },
  { id: 'disco_detention', label: 'Disco detention', description: 'Secret playlist energy — stay funky, stay seated' },
  { id: 'snack_emergency', label: 'Snack emergency', description: 'Cafeteria panic colors — the vending machine understands' },
] as const;

export type AnimatedBackgroundStyle = (typeof ANIMATED_BACKGROUND_STYLES)[number]['id'];

export function normalizeAnimatedBackgroundStyle(v: unknown): AnimatedBackgroundStyle {
  if (typeof v === 'string' && ANIMATED_BACKGROUND_STYLES.some((s) => s.id === v)) {
    return v as AnimatedBackgroundStyle;
  }
  return 'arcade';
}

/** If the active style is hidden, pick the first catalog entry that is not hidden. */
export function resolveAnimatedBackgroundStyle(
  style: AnimatedBackgroundStyle,
  hidden: readonly AnimatedBackgroundStyle[] | undefined,
): AnimatedBackgroundStyle {
  const hid = new Set(hidden ?? []);
  if (!hid.has(style)) return style;
  const first = ANIMATED_BACKGROUND_STYLES.find((s) => !hid.has(s.id));
  return first?.id ?? ANIMATED_BACKGROUND_STYLES[0].id;
}

export function sanitizeHiddenAnimatedBackgroundIds(
  raw: unknown,
): AnimatedBackgroundStyle[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(ANIMATED_BACKGROUND_STYLES.map((s) => s.id));
  const seen = new Set<string>();
  const out: AnimatedBackgroundStyle[] = [];
  for (const id of raw) {
    if (typeof id !== 'string' || !valid.has(id as AnimatedBackgroundStyle) || seen.has(id)) continue;
    seen.add(id);
    out.push(id as AnimatedBackgroundStyle);
  }
  return out;
}

/** Header shell: when animated backdrop is on, use a vertical gradient so art shows through the top bar. */
export function headerAnimatedBackdropClassName(active: boolean): string {
  if (!active) {
    return 'bg-background/80 backdrop-blur-xl';
  }
  return cn(
    'backdrop-blur-md',
    'bg-gradient-to-b from-background/50 via-background/88 to-background/[0.98]',
    'dark:from-background/38 dark:via-background/78 dark:to-background/[0.98]',
  );
}

/** App layout top bar (simpler strip). */
export function appHeaderAnimatedBackdropClassName(active: boolean): string {
  if (!active) {
    return 'border-b border-border/10';
  }
  return cn(
    'border-b border-border/10',
    'backdrop-blur-md',
    'bg-gradient-to-b from-background/45 via-background/82 to-background/95',
    'dark:from-background/32 dark:via-background/72 dark:to-background/94',
  );
}
