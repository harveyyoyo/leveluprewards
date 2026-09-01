/**
 * Visual themes for the Classroom realm (background, glow, grid, accent gradient).
 * Colors apply via `--cr-*` custom properties (see `globals.css`).
 */

export const CLASSROOM_REALM_THEME_IDS = [
  'chalkboard',
  'smartboard',
  'sunrise',
  'library',
  'nightowl',
  'studio',
  'meadow',
  'paper',
] as const;

export type ClassroomRealmThemeId = (typeof CLASSROOM_REALM_THEME_IDS)[number];

export const DEFAULT_CLASSROOM_REALM_THEME: ClassroomRealmThemeId = 'chalkboard';

type ClassroomRealmThemeTokens = {
  base: string;
  glowTop: string;
  glowBottom: string;
  gradFrom: string;
  gradMid: string;
  gradTo: string;
  grid: string;
  dust: string;
  accentFrom: string;
  accentTo: string;
  accentText: string;
  onAccent: string;
};

export type ClassroomRealmTheme = {
  id: ClassroomRealmThemeId;
  label: string;
  description: string;
  icon: string;
  tokens: ClassroomRealmThemeTokens;
};

export const CLASSROOM_REALM_THEMES: ClassroomRealmTheme[] = [
  {
    id: 'chalkboard',
    label: 'Chalkboard',
    description: 'Deep green slate with gold chalk accents.',
    icon: '✏️',
    tokens: {
      base: '#102016',
      glowTop: 'rgba(163, 230, 53, 0.22)',
      glowBottom: 'rgba(251, 191, 36, 0.14)',
      gradFrom: '#173022',
      gradMid: '#102016',
      gradTo: '#08110c',
      grid: 'rgba(190, 242, 100, 0.08)',
      dust: 'rgba(253, 230, 138, 0.28)',
      accentFrom: '#fbbf24',
      accentTo: '#65a30d',
      accentText: '#d9f99d',
      onAccent: '#142016',
    },
  },
  {
    id: 'smartboard',
    label: 'Smart board',
    description: 'Indigo classroom glow with teal highlights.',
    icon: '🖥️',
    tokens: {
      base: '#0c1222',
      glowTop: 'rgba(99, 102, 241, 0.35)',
      glowBottom: 'rgba(20, 184, 166, 0.14)',
      gradFrom: '#131a2e',
      gradMid: '#0c1222',
      gradTo: '#060a14',
      grid: 'rgba(99, 102, 241, 0.08)',
      dust: 'rgba(165, 180, 252, 0.22)',
      accentFrom: '#6366f1',
      accentTo: '#14b8a6',
      accentText: '#a5b4fc',
      onAccent: '#ffffff',
    },
  },
  {
    id: 'sunrise',
    label: 'Sunrise',
    description: 'Warm morning light for first period.',
    icon: '🌅',
    tokens: {
      base: '#2a1610',
      glowTop: 'rgba(251, 146, 60, 0.38)',
      glowBottom: 'rgba(244, 114, 182, 0.12)',
      gradFrom: '#3b1d12',
      gradMid: '#2a1610',
      gradTo: '#140a08',
      grid: 'rgba(253, 186, 116, 0.10)',
      dust: 'rgba(254, 215, 170, 0.28)',
      accentFrom: '#fb923c',
      accentTo: '#e11d48',
      accentText: '#fed7aa',
      onAccent: '#2a1610',
    },
  },
  {
    id: 'library',
    label: 'Library',
    description: 'Walnut wood and warm reading-lamp gold.',
    icon: '📚',
    tokens: {
      base: '#1a1410',
      glowTop: 'rgba(217, 119, 6, 0.28)',
      glowBottom: 'rgba(180, 83, 9, 0.14)',
      gradFrom: '#2a1c14',
      gradMid: '#1a1410',
      gradTo: '#0c0907',
      grid: 'rgba(253, 230, 138, 0.08)',
      dust: 'rgba(253, 230, 138, 0.24)',
      accentFrom: '#d97706',
      accentTo: '#92400e',
      accentText: '#fde68a',
      onAccent: '#1a1410',
    },
  },
  {
    id: 'nightowl',
    label: 'Night owl',
    description: 'Moonlit navy for after-school sessions.',
    icon: '🌙',
    tokens: {
      base: '#0a1024',
      glowTop: 'rgba(96, 165, 250, 0.28)',
      glowBottom: 'rgba(129, 140, 248, 0.16)',
      gradFrom: '#121a36',
      gradMid: '#0a1024',
      gradTo: '#050814',
      grid: 'rgba(147, 197, 253, 0.08)',
      dust: 'rgba(191, 219, 254, 0.22)',
      accentFrom: '#60a5fa',
      accentTo: '#818cf8',
      accentText: '#bfdbfe',
      onAccent: '#0a1024',
    },
  },
  {
    id: 'studio',
    label: 'Art studio',
    description: 'Creative magenta and cyan for project days.',
    icon: '🎨',
    tokens: {
      base: '#16101f',
      glowTop: 'rgba(232, 121, 249, 0.28)',
      glowBottom: 'rgba(34, 211, 238, 0.16)',
      gradFrom: '#22162e',
      gradMid: '#16101f',
      gradTo: '#0b0812',
      grid: 'rgba(240, 171, 252, 0.09)',
      dust: 'rgba(245, 208, 254, 0.24)',
      accentFrom: '#e879f9',
      accentTo: '#22d3ee',
      accentText: '#f5d0fe',
      onAccent: '#16101f',
    },
  },
  {
    id: 'meadow',
    label: 'Meadow',
    description: 'Sage and sky — an outdoor-classroom feel.',
    icon: '🌿',
    tokens: {
      base: '#0f1c16',
      glowTop: 'rgba(52, 211, 153, 0.25)',
      glowBottom: 'rgba(125, 211, 252, 0.14)',
      gradFrom: '#173026',
      gradMid: '#0f1c16',
      gradTo: '#07110d',
      grid: 'rgba(167, 243, 208, 0.08)',
      dust: 'rgba(167, 243, 208, 0.22)',
      accentFrom: '#34d399',
      accentTo: '#38bdf8',
      accentText: '#a7f3d0',
      onAccent: '#0f1c16',
    },
  },
  {
    id: 'paper',
    label: 'Lined paper',
    description: 'Warm kraft paper with pencil-yellow accents.',
    icon: '📝',
    tokens: {
      base: '#1c1814',
      glowTop: 'rgba(252, 211, 77, 0.18)',
      glowBottom: 'rgba(214, 211, 209, 0.08)',
      gradFrom: '#2a241c',
      gradMid: '#1c1814',
      gradTo: '#0e0c0a',
      grid: 'rgba(231, 229, 228, 0.08)',
      dust: 'rgba(253, 230, 138, 0.20)',
      accentFrom: '#f59e0b',
      accentTo: '#78716c',
      accentText: '#fde68a',
      onAccent: '#1c1814',
    },
  },
];

const THEME_BY_ID = new Map(CLASSROOM_REALM_THEMES.map((t) => [t.id, t]));

/** Older Classroom realm builds used a single hardcoded "aurora" look. */
const LEGACY_THEME_ALIASES: Record<string, ClassroomRealmThemeId> = {
  aurora: 'smartboard',
};

export function resolveClassroomRealmTheme(
  value: string | null | undefined,
): ClassroomRealmTheme {
  const aliased = value ? LEGACY_THEME_ALIASES[value] : undefined;
  const id = (aliased ?? value) as ClassroomRealmThemeId;
  return THEME_BY_ID.get(id) ?? THEME_BY_ID.get(DEFAULT_CLASSROOM_REALM_THEME)!;
}

export function classroomRealmThemeVars(
  theme: ClassroomRealmTheme = resolveClassroomRealmTheme(DEFAULT_CLASSROOM_REALM_THEME),
): Record<string, string> {
  const t = theme.tokens;
  return {
    '--cr-base': t.base,
    '--cr-glow-top': t.glowTop,
    '--cr-glow-bottom': t.glowBottom,
    '--cr-grad-from': t.gradFrom,
    '--cr-grad-mid': t.gradMid,
    '--cr-grad-to': t.gradTo,
    '--cr-grid': t.grid,
    '--cr-dust': t.dust,
    '--cr-accent-from': t.accentFrom,
    '--cr-accent-to': t.accentTo,
    '--cr-accent-text': t.accentText,
    '--cr-on-accent': t.onAccent,
  };
}

export function classroomRealmSwatchBackground(theme: ClassroomRealmTheme): string {
  const t = theme.tokens;
  return [
    `radial-gradient(ellipse 90% 70% at 50% -15%, ${t.glowTop}, transparent 62%)`,
    `radial-gradient(ellipse 70% 50% at 100% 110%, ${t.glowBottom}, transparent 60%)`,
    `linear-gradient(180deg, ${t.gradFrom}, ${t.gradTo})`,
  ].join(', ');
}
