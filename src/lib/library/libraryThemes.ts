/**
 * Visual themes for the Library Workspace and Self-Checkout Portal.
 * Designed with strict WCAG AA contrast compliance (>= 4.5:1) for comfortable reading.
 */

export const LIBRARY_THEME_IDS = [
  'classic_oak',
  'modern_sapphire',
  'emerald_study',
  'clean_daylight',
  'midnight_archive',
  'sunset_terrace',
  'lavender_reading',
] as const;

export type LibraryThemeId = (typeof LIBRARY_THEME_IDS)[number];

export const DEFAULT_LIBRARY_THEME: LibraryThemeId = 'classic_oak';

export interface LibraryTheme {
  id: LibraryThemeId;
  label: string;
  tagline: string;
  description: string;
  icon: string;
  tone: 'light' | 'dark';
  swatches: {
    primary: string;
    secondary: string;
    bg: string;
    text: string;
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
  classic_oak: {
    id: 'classic_oak',
    label: 'Classic Oak',
    tagline: 'Warm Wooden Archive',
    description: 'Rich amber wood, parchment card finishes, and collegiate library charm.',
    icon: '📜',
    tone: 'light',
    swatches: {
      primary: '#92400e',
      secondary: '#b45309',
      bg: '#fbf8f2',
      text: '#291809',
    },
    classes: {
      wrapper: 'bg-[#fbf8f2] text-[#291809]',
      header: 'bg-[#f8f2e6]/90 border-[#e8ddc9]',
      card: 'bg-white/90 border-[#e8ddc9] shadow-amber-900/5',
      cardHighlight: 'border-amber-500/30 bg-amber-500/5',
      badge: 'border-amber-300 bg-amber-100/80 text-amber-950',
      accent: 'text-amber-800',
      button: 'bg-amber-800 text-white hover:bg-amber-900',
    },
  },
  modern_sapphire: {
    id: 'modern_sapphire',
    label: 'Modern Sapphire',
    tagline: 'Collegiate Campus Library',
    description: 'Crisp royal sapphire, bright slate backdrop, and professional research vibe.',
    icon: '📘',
    tone: 'light',
    swatches: {
      primary: '#1d4ed8',
      secondary: '#2563eb',
      bg: '#f4f8fd',
      text: '#0b1f3a',
    },
    classes: {
      wrapper: 'bg-[#f4f8fd] text-[#0b1f3a]',
      header: 'bg-white/90 border-blue-100',
      card: 'bg-white/90 border-blue-100 shadow-blue-900/5',
      cardHighlight: 'border-blue-500/30 bg-blue-500/5',
      badge: 'border-blue-200 bg-blue-100 text-blue-950',
      accent: 'text-blue-700',
      button: 'bg-blue-700 text-white hover:bg-blue-800',
    },
  },
  emerald_study: {
    id: 'emerald_study',
    label: 'Emerald Study',
    tagline: 'Quiet Reading Sanctuary',
    description: 'Deep forest sage with warm brass accents for quiet contemplation.',
    icon: '🌿',
    tone: 'light',
    swatches: {
      primary: '#15803d',
      secondary: '#166534',
      bg: '#f2f8f4',
      text: '#092615',
    },
    classes: {
      wrapper: 'bg-[#f2f8f4] text-[#092615]',
      header: 'bg-white/90 border-emerald-100',
      card: 'bg-white/90 border-emerald-100 shadow-emerald-900/5',
      cardHighlight: 'border-emerald-500/30 bg-emerald-500/5',
      badge: 'border-emerald-200 bg-emerald-100 text-emerald-950',
      accent: 'text-emerald-700',
      button: 'bg-emerald-700 text-white hover:bg-emerald-800',
    },
  },
  clean_daylight: {
    id: 'clean_daylight',
    label: 'Clean Daylight',
    tagline: 'Modern Media Center',
    description: 'Airy minimalist slate and sky accents for bright, active school libraries.',
    icon: '☀️',
    tone: 'light',
    swatches: {
      primary: '#0284c7',
      secondary: '#0369a1',
      bg: '#f8fafc',
      text: '#0f172a',
    },
    classes: {
      wrapper: 'bg-[#f8fafc] text-[#0f172a]',
      header: 'bg-white/90 border-slate-200',
      card: 'bg-white/90 border-slate-200 shadow-slate-900/5',
      cardHighlight: 'border-sky-500/30 bg-sky-500/5',
      badge: 'border-sky-200 bg-sky-100 text-sky-950',
      accent: 'text-sky-700',
      button: 'bg-sky-700 text-white hover:bg-sky-800',
    },
  },
  midnight_archive: {
    id: 'midnight_archive',
    label: 'Midnight Archive',
    tagline: 'Nocturnal Digital Stack',
    description: 'High-contrast dark mode with glowing cyan and amber accents.',
    icon: '🌙',
    tone: 'dark',
    swatches: {
      primary: '#38bdf8',
      secondary: '#0284c7',
      bg: '#0b1120',
      text: '#f8fafc',
    },
    classes: {
      wrapper: 'bg-[#0b1120] text-[#f8fafc] dark',
      header: 'bg-[#0f172a]/90 border-slate-800',
      card: 'bg-[#0f172a]/90 border-slate-800 shadow-black/40',
      cardHighlight: 'border-sky-500/30 bg-sky-500/10',
      badge: 'border-sky-700 bg-sky-950 text-sky-200',
      accent: 'text-sky-400',
      button: 'bg-sky-600 text-white hover:bg-sky-500',
    },
  },
  sunset_terrace: {
    id: 'sunset_terrace',
    label: 'Sunset Terrace',
    tagline: 'Cozy Elementary Nook',
    description: 'Warm coral, peach, and terracotta accents for welcoming junior readers.',
    icon: '🌅',
    tone: 'light',
    swatches: {
      primary: '#c2410c',
      secondary: '#ea580c',
      bg: '#fdf6f0',
      text: '#361608',
    },
    classes: {
      wrapper: 'bg-[#fdf6f0] text-[#361608]',
      header: 'bg-white/90 border-orange-100',
      card: 'bg-white/90 border-orange-100 shadow-orange-900/5',
      cardHighlight: 'border-orange-500/30 bg-orange-500/5',
      badge: 'border-orange-200 bg-orange-100 text-orange-950',
      accent: 'text-orange-700',
      button: 'bg-orange-700 text-white hover:bg-orange-800',
    },
  },
  lavender_reading: {
    id: 'lavender_reading',
    label: 'Lavender Reading',
    tagline: 'Tranquil Story Corner',
    description: 'Calm purple tones and soft violet card borders for focused quiet reading.',
    icon: '🪻',
    tone: 'light',
    swatches: {
      primary: '#6d28d9',
      secondary: '#7c3aed',
      bg: '#faf7fd',
      text: '#241038',
    },
    classes: {
      wrapper: 'bg-[#faf7fd] text-[#241038]',
      header: 'bg-white/90 border-purple-100',
      card: 'bg-white/90 border-purple-100 shadow-purple-900/5',
      cardHighlight: 'border-purple-500/30 bg-purple-500/5',
      badge: 'border-purple-200 bg-purple-100 text-purple-950',
      accent: 'text-purple-700',
      button: 'bg-purple-700 text-white hover:bg-purple-800',
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
