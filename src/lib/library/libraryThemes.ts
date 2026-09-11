/**
 * Visual themes for the Library Workspace and Self-Checkout Portal.
 * Designed with strict WCAG AA contrast compliance (>= 4.5:1) for comfortable reading.
 * Includes Look-and-Feel Styles (Fun & Playful, Pro & Modern, Classic & Cozy, Dark & Cyber)
 * that adapt corner radii, density, button shapes, and workspace ambiance.
 */

export const LIBRARY_THEME_IDS = [
  'arcade_adventure',
  'storybook_meadow',
  'sunset_terrace',
  'lavender_reading',
  'modern_sapphire',
  'clean_daylight',
  'classic_oak',
  'emerald_study',
  'midnight_archive',
  'night_desk',
  'reading_room',
] as const;

export type LibraryThemeId = (typeof LIBRARY_THEME_IDS)[number];

export const DEFAULT_LIBRARY_THEME: LibraryThemeId = 'classic_oak';

export type LibraryStyleCategory = 'fun' | 'pro' | 'classic' | 'cyber';

export interface LibraryTheme {
  id: LibraryThemeId;
  label: string;
  tagline: string;
  description: string;
  icon: string;
  tone: 'light' | 'dark';
  styleCategory: LibraryStyleCategory;
  styleName: string;
  swatches: {
    primary: string;
    secondary: string;
    bg: string;
    text: string;
  };
  uiClasses: {
    cardRadius: string;
    buttonRadius: string;
    badgeRadius: string;
    cardShadow: string;
    greeting: string;
  };
  classes: {
    wrapper: string;
    header: string;
    card: string;
    cardHighlight: string;
    badge: string;
    accent: string;
    button: string;
  };
}

export const LIBRARY_THEMES: Record<LibraryThemeId, LibraryTheme> = {
  arcade_adventure: {
    id: 'arcade_adventure',
    label: 'Arcade Adventure',
    tagline: 'Playful Gamified Stacks',
    description: 'Energetic purple and warm amber accents with playful bouncy cards for fun reading.',
    icon: '👾',
    tone: 'light',
    styleCategory: 'fun',
    styleName: 'Fun & Playful',
    swatches: {
      primary: '#7e22ce',
      secondary: '#d97706',
      bg: '#faf5ff',
      text: '#2e1065',
    },
    uiClasses: {
      cardRadius: 'rounded-3xl',
      buttonRadius: 'rounded-2xl',
      badgeRadius: 'rounded-full px-3 py-1',
      cardShadow: 'shadow-md hover:shadow-xl',
      greeting: 'Level up your reading adventure today! 🚀',
    },
    classes: {
      wrapper: 'bg-[#faf5ff] text-[#2e1065]',
      header: 'bg-white/90 border-purple-200',
      card: 'bg-white/95 border-purple-200/80 shadow-purple-900/5',
      cardHighlight: 'border-purple-500/40 bg-purple-500/10 ring-2 ring-purple-400/30',
      badge: 'border-purple-300 bg-purple-100 text-purple-950 font-bold',
      accent: 'text-purple-700',
      button: 'bg-purple-700 text-white hover:bg-purple-800 shadow-purple-700/20 shadow-md',
    },
  },
  storybook_meadow: {
    id: 'storybook_meadow',
    label: 'Storybook Meadow',
    tagline: 'Cheerful Elementary Garden',
    description: 'Sunny meadow yellow, fresh spring greens, and rounded storybook cards.',
    icon: '🌻',
    tone: 'light',
    styleCategory: 'fun',
    styleName: 'Fun & Playful',
    swatches: {
      primary: '#15803d',
      secondary: '#b45309',
      bg: '#fefce8',
      text: '#14532d',
    },
    uiClasses: {
      cardRadius: 'rounded-3xl',
      buttonRadius: 'rounded-2xl',
      badgeRadius: 'rounded-full px-3 py-1',
      cardShadow: 'shadow-md hover:shadow-lg',
      greeting: 'Every book is a new journey waiting to bloom! 📖',
    },
    classes: {
      wrapper: 'bg-[#fefce8] text-[#14532d]',
      header: 'bg-white/90 border-emerald-200',
      card: 'bg-white/95 border-emerald-200/80 shadow-emerald-900/5',
      cardHighlight: 'border-emerald-500/40 bg-emerald-500/10 ring-2 ring-emerald-400/30',
      badge: 'border-emerald-300 bg-emerald-100 text-emerald-950 font-bold',
      accent: 'text-emerald-700',
      button: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-emerald-700/20 shadow-md',
    },
  },
  sunset_terrace: {
    id: 'sunset_terrace',
    label: 'Sunset Terrace',
    tagline: 'Cozy Elementary Nook',
    description: 'Warm coral, peach, and terracotta accents for welcoming junior readers.',
    icon: '🌅',
    tone: 'light',
    styleCategory: 'fun',
    styleName: 'Fun & Playful',
    swatches: {
      primary: '#c2410c',
      secondary: '#ea580c',
      bg: '#fdf6f0',
      text: '#361608',
    },
    uiClasses: {
      cardRadius: 'rounded-3xl',
      buttonRadius: 'rounded-2xl',
      badgeRadius: 'rounded-full px-3 py-1',
      cardShadow: 'shadow-md hover:shadow-lg',
      greeting: 'Warm welcome to your neighborhood story nook! ☀️',
    },
    classes: {
      wrapper: 'bg-[#fdf6f0] text-[#361608]',
      header: 'bg-white/90 border-orange-200',
      card: 'bg-white/95 border-orange-200/80 shadow-orange-900/5',
      cardHighlight: 'border-orange-500/40 bg-orange-500/10 ring-2 ring-orange-400/30',
      badge: 'border-orange-300 bg-orange-100 text-orange-950 font-bold',
      accent: 'text-orange-700',
      button: 'bg-orange-700 text-white hover:bg-orange-800 shadow-orange-700/20 shadow-md',
    },
  },
  lavender_reading: {
    id: 'lavender_reading',
    label: 'Lavender Reading',
    tagline: 'Tranquil Story Corner',
    description: 'Calm purple tones and soft violet card borders for focused quiet reading.',
    icon: '🪻',
    tone: 'light',
    styleCategory: 'fun',
    styleName: 'Fun & Playful',
    swatches: {
      primary: '#6d28d9',
      secondary: '#7c3aed',
      bg: '#faf7fd',
      text: '#241038',
    },
    uiClasses: {
      cardRadius: 'rounded-3xl',
      buttonRadius: 'rounded-2xl',
      badgeRadius: 'rounded-full px-3 py-1',
      cardShadow: 'shadow-md hover:shadow-lg',
      greeting: 'Relax, explore, and find your next favorite story. 💜',
    },
    classes: {
      wrapper: 'bg-[#faf7fd] text-[#241038]',
      header: 'bg-white/90 border-purple-200',
      card: 'bg-white/95 border-purple-200/80 shadow-purple-900/5',
      cardHighlight: 'border-purple-500/40 bg-purple-500/10 ring-2 ring-purple-400/30',
      badge: 'border-purple-300 bg-purple-100 text-purple-950 font-bold',
      accent: 'text-purple-700',
      button: 'bg-purple-700 text-white hover:bg-purple-800 shadow-purple-700/20 shadow-md',
    },
  },
  modern_sapphire: {
    id: 'modern_sapphire',
    label: 'Modern Sapphire',
    tagline: 'Collegiate Campus Library',
    description: 'Crisp royal sapphire, bright slate backdrop, and professional research vibe.',
    icon: '📘',
    tone: 'light',
    styleCategory: 'pro',
    styleName: 'Pro & Modern',
    swatches: {
      primary: '#1d4ed8',
      secondary: '#2563eb',
      bg: '#f4f8fd',
      text: '#0b1f3a',
    },
    uiClasses: {
      cardRadius: 'rounded-xl',
      buttonRadius: 'rounded-lg',
      badgeRadius: 'rounded-md px-2 py-0.5',
      cardShadow: 'shadow-xs hover:shadow-sm',
      greeting: 'Media Center Catalog & Research Operations 🔍',
    },
    classes: {
      wrapper: 'bg-[#f4f8fd] text-[#0b1f3a]',
      header: 'bg-white/90 border-blue-100',
      card: 'bg-white/90 border-blue-100 shadow-blue-900/5',
      cardHighlight: 'border-blue-500/30 bg-blue-500/5 ring-1 ring-blue-500/30',
      badge: 'border-blue-200 bg-blue-100 text-blue-950',
      accent: 'text-blue-700',
      button: 'bg-blue-700 text-white hover:bg-blue-800',
    },
  },
  clean_daylight: {
    id: 'clean_daylight',
    label: 'Clean Daylight',
    tagline: 'Modern Media Center',
    description: 'Airy minimalist slate and sky accents for bright, active school libraries.',
    icon: '☀️',
    tone: 'light',
    styleCategory: 'pro',
    styleName: 'Pro & Modern',
    swatches: {
      primary: '#0284c7',
      secondary: '#0369a1',
      bg: '#f8fafc',
      text: '#0f172a',
    },
    uiClasses: {
      cardRadius: 'rounded-xl',
      buttonRadius: 'rounded-lg',
      badgeRadius: 'rounded-md px-2 py-0.5',
      cardShadow: 'shadow-xs hover:shadow-sm',
      greeting: 'Modern Media Center & Active Resource Desk 💡',
    },
    classes: {
      wrapper: 'bg-[#f8fafc] text-[#0f172a]',
      header: 'bg-white/90 border-slate-200',
      card: 'bg-white/90 border-slate-200 shadow-slate-900/5',
      cardHighlight: 'border-sky-500/30 bg-sky-500/5 ring-1 ring-sky-500/30',
      badge: 'border-sky-200 bg-sky-100 text-sky-950',
      accent: 'text-sky-700',
      button: 'bg-sky-700 text-white hover:bg-sky-800',
    },
  },
  classic_oak: {
    id: 'classic_oak',
    label: 'Classic Oak',
    tagline: 'Warm Wooden Archive',
    description: 'Rich amber wood, parchment card finishes, and collegiate library charm.',
    icon: '📜',
    tone: 'light',
    styleCategory: 'classic',
    styleName: 'Classic & Cozy',
    swatches: {
      primary: '#92400e',
      secondary: '#b45309',
      bg: '#fbf8f2',
      text: '#291809',
    },
    uiClasses: {
      cardRadius: 'rounded-2xl',
      buttonRadius: 'rounded-xl',
      badgeRadius: 'rounded-lg px-2.5 py-0.5',
      cardShadow: 'shadow-sm hover:shadow-md',
      greeting: 'Welcome to the School Library & Reading Sanctuary 📚',
    },
    classes: {
      wrapper: 'bg-[#fbf8f2] text-[#291809]',
      header: 'bg-[#f8f2e6]/90 border-[#e8ddc9]',
      card: 'bg-white/90 border-[#e8ddc9] shadow-amber-900/5',
      cardHighlight: 'border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/30',
      badge: 'border-amber-300 bg-amber-100/80 text-amber-950',
      accent: 'text-amber-800',
      button: 'bg-amber-800 text-white hover:bg-amber-900',
    },
  },
  emerald_study: {
    id: 'emerald_study',
    label: 'Emerald Study',
    tagline: 'Quiet Reading Sanctuary',
    description: 'Deep forest sage with warm brass accents for quiet contemplation.',
    icon: '🌿',
    tone: 'light',
    styleCategory: 'classic',
    styleName: 'Classic & Cozy',
    swatches: {
      primary: '#15803d',
      secondary: '#166534',
      bg: '#f2f8f4',
      text: '#092615',
    },
    uiClasses: {
      cardRadius: 'rounded-2xl',
      buttonRadius: 'rounded-xl',
      badgeRadius: 'rounded-lg px-2.5 py-0.5',
      cardShadow: 'shadow-sm hover:shadow-md',
      greeting: 'Quiet Reading & Academic Study Sanctuary 🍃',
    },
    classes: {
      wrapper: 'bg-[#f2f8f4] text-[#092615]',
      header: 'bg-white/90 border-emerald-100',
      card: 'bg-white/90 border-emerald-100 shadow-emerald-900/5',
      cardHighlight: 'border-emerald-500/30 bg-emerald-500/5 ring-1 ring-emerald-500/30',
      badge: 'border-emerald-200 bg-emerald-100 text-emerald-950',
      accent: 'text-emerald-700',
      button: 'bg-emerald-700 text-white hover:bg-emerald-800',
    },
  },
  midnight_archive: {
    id: 'midnight_archive',
    label: 'Midnight Archive',
    tagline: 'Nocturnal Digital Stack',
    description: 'High-contrast dark mode with glowing cyan and amber accents.',
    icon: '🌙',
    tone: 'dark',
    styleCategory: 'cyber',
    styleName: 'Dark & Cyber',
    swatches: {
      primary: '#38bdf8',
      secondary: '#0284c7',
      bg: '#0b1120',
      text: '#f8fafc',
    },
    uiClasses: {
      cardRadius: 'rounded-xl',
      buttonRadius: 'rounded-lg',
      badgeRadius: 'rounded-md px-2 py-0.5',
      cardShadow: 'shadow-md shadow-sky-950/20 hover:shadow-lg',
      greeting: 'Nocturnal Digital Archive & High-Contrast Terminal ⚡',
    },
    classes: {
      wrapper: 'bg-[#0b1120] text-[#f8fafc] dark',
      header: 'bg-[#0f172a]/90 border-slate-800',
      card: 'bg-[#0f172a]/90 border-slate-800 shadow-black/40',
      cardHighlight: 'border-sky-500/30 bg-sky-500/10 ring-1 ring-sky-500/30',
      badge: 'border-sky-700 bg-sky-950 text-sky-200',
      accent: 'text-sky-400',
      button: 'bg-sky-600 text-white hover:bg-sky-500',
    },
  },
  night_desk: {
    id: 'night_desk',
    label: 'Night Desk',
    tagline: 'Nocturnal Circulation Station',
    description: 'Deep obsidian-navy workspace with warm amber gold highlights, high-impact badge scanner, and metric command tiles.',
    icon: '🦉',
    tone: 'dark',
    styleCategory: 'cyber',
    styleName: 'Night Desk',
    swatches: {
      primary: '#f59e0b',
      secondary: '#d97706',
      bg: '#0b1324',
      text: '#f8fafc',
    },
    uiClasses: {
      cardRadius: 'rounded-3xl',
      buttonRadius: 'rounded-2xl',
      badgeRadius: 'rounded-full px-3 py-1',
      cardShadow: 'shadow-2xl shadow-black/60',
      greeting: 'Nocturnal Circulation & High-Focus Stacks 🌙',
    },
    classes: {
      wrapper: 'bg-[#0b1324] text-[#f8fafc] dark',
      header: 'bg-[#0f172a]/95 border-slate-800',
      card: 'bg-[#0f172a]/95 border-slate-800 shadow-black/50',
      cardHighlight: 'border-amber-500/40 bg-amber-500/10 ring-2 ring-amber-500/30',
      badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold',
      accent: 'text-amber-400',
      button: 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold shadow-amber-500/20 shadow-md',
    },
  },
  reading_room: {
    id: 'reading_room',
    label: 'The Reading Room',
    tagline: 'Literary & Scholarly Gazette',
    description: 'Sophisticated editorial layout with literary headlines, ledger metrics, and newspaper typography.',
    icon: '📰',
    tone: 'light',
    styleCategory: 'classic',
    styleName: 'Editorial',
    swatches: {
      primary: '#1e3a8a',
      secondary: '#475569',
      bg: '#fafaf9',
      text: '#0f172a',
    },
    uiClasses: {
      cardRadius: 'rounded-lg',
      buttonRadius: 'rounded-full',
      badgeRadius: 'rounded-sm px-2 py-0.5',
      cardShadow: 'shadow-xs',
      greeting: 'Every book has a reader waiting for it. 📖',
    },
    classes: {
      wrapper: 'bg-[#fafaf9] text-[#0f172a]',
      header: 'bg-white/95 border-b border-stone-200',
      card: 'bg-white border border-stone-200 shadow-stone-900/5',
      cardHighlight: 'border-blue-600/40 bg-blue-50/50 ring-1 ring-blue-500/30',
      badge: 'border-stone-300 bg-stone-100 text-stone-900 font-semibold',
      accent: 'text-blue-700',
      button: 'bg-slate-900 text-white hover:bg-slate-800 font-bold',
    },
  },
};

const THEME_SET = new Set<string>(LIBRARY_THEME_IDS);

export function resolveLibraryTheme(themeId?: string | null): LibraryTheme {
  if (themeId && THEME_SET.has(themeId)) {
    return LIBRARY_THEMES[themeId as LibraryThemeId];
  }
  return LIBRARY_THEMES[DEFAULT_LIBRARY_THEME];
}
