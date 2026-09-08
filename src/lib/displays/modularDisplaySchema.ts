import type { LucideIcon } from 'lucide-react';
import {
  Cake,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Clock,
  CloudSun,
  Crown,
  Gift,
  Heart,
  Lightbulb,
  Megaphone,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react';

/** All supported modular display widgets across Hall of Fame, Smart Screen, and Bulletin */
export const DISPLAY_MODULE_KEYS = [
  // Hall of Fame
  'podium',
  'studentLeaders',
  'classStandings',
  'houseStandings',
  'schoolGoal',
  // Smart Screen & Daily Info
  'clockDate',
  'weather',
  'schoolStats',
  'daySchedule',
  'compliment',
  'focusSkill',
  'quote',
  'birthdays',
  'hebrewCalendar',
  // Bulletin & Rewards
  'celebrationPosts',
  'incentiveTasks',
  'rewardsShowcase',
] as const;

export type DisplayModuleKey = (typeof DISPLAY_MODULE_KEYS)[number];

export type DisplayModuleCategory = 'hall-of-fame' | 'smart-screen' | 'bulletin';

export type DisplayModuleMeta = {
  key: DisplayModuleKey;
  label: string;
  shortLabel: string;
  description: string;
  category: DisplayModuleCategory;
  icon: LucideIcon;
};

export const DISPLAY_MODULE_CATALOG: readonly DisplayModuleMeta[] = [
  // Hall of Fame
  {
    key: 'podium',
    label: 'Hall of Fame Podium',
    shortLabel: 'Podium',
    description: 'Gold, silver, and bronze stands with crowns and avatars for top leaders.',
    category: 'hall-of-fame',
    icon: Crown,
  },
  {
    key: 'studentLeaders',
    label: 'Student Leaderboard',
    shortLabel: 'Leaderboard',
    description: 'Ranked roster of top point earners with privacy-safe display names.',
    category: 'hall-of-fame',
    icon: Trophy,
  },
  {
    key: 'classStandings',
    label: 'Class Standings',
    shortLabel: 'Classes',
    description: 'Classroom rankings and featured class spotlight of the day.',
    category: 'hall-of-fame',
    icon: Users,
  },
  {
    key: 'houseStandings',
    label: 'House Standings',
    shortLabel: 'Houses',
    description: 'House system points, progress meters, and team rankings.',
    category: 'hall-of-fame',
    icon: Star,
  },
  {
    key: 'schoolGoal',
    label: 'School-Wide Goal',
    shortLabel: 'School Goal',
    description: 'Progress bar and celebration target for the school-wide milestone.',
    category: 'hall-of-fame',
    icon: Target,
  },

  // Smart Screen & Daily Info
  {
    key: 'clockDate',
    label: 'Clock & Date Hero',
    shortLabel: 'Clock',
    description: 'High-visibility digital time, day of week, and full date.',
    category: 'smart-screen',
    icon: Clock,
  },
  {
    key: 'weather',
    label: 'Weather & Forecast',
    shortLabel: 'Weather',
    description: 'Live local weather condition, temperature, and location name.',
    category: 'smart-screen',
    icon: CloudSun,
  },
  {
    key: 'schoolStats',
    label: 'School Daily Stats',
    shortLabel: 'Stats',
    description: 'Quick totals for enrolled students, points awarded, and prizes available.',
    category: 'smart-screen',
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    key: 'daySchedule',
    label: "Today's Schedule",
    shortLabel: 'Schedule',
    description: 'Daily school routine milestones (Arrive, Learn, Level Up).',
    category: 'smart-screen',
    icon: CalendarDays,
  },
  {
    key: 'compliment',
    label: 'Daily Compliment',
    shortLabel: 'Compliment',
    description: 'Daily rotating community appreciation and positive culture message.',
    category: 'smart-screen',
    icon: Heart,
  },
  {
    key: 'focusSkill',
    label: 'Focus Skill of the Day',
    shortLabel: 'Focus',
    description: 'Target character trait or social-emotional habit to practice today.',
    category: 'smart-screen',
    icon: Lightbulb,
  },
  {
    key: 'quote',
    label: 'Inspirational Quote',
    shortLabel: 'Quote',
    description: 'Motivational quote about growth mindset, persistence, and teamwork.',
    category: 'smart-screen',
    icon: Sparkles,
  },
  {
    key: 'birthdays',
    label: 'Birthday Spotlight',
    shortLabel: 'Birthdays',
    description: 'Celebrate students with birthdays today on the hallway screen.',
    category: 'smart-screen',
    icon: Cake,
  },
  {
    key: 'hebrewCalendar',
    label: 'Hebrew Date & Holidays',
    shortLabel: 'Hebrew Date',
    description: "Today's Hebrew calendar date and countdown to upcoming Jewish holidays.",
    category: 'smart-screen',
    icon: Star,
  },

  // Bulletin & Rewards
  {
    key: 'celebrationPosts',
    label: 'Celebration Posts & Shoutouts',
    shortLabel: 'Celebrations',
    description: 'Live ticker of teacher praise posts, event shoutouts, and achievements.',
    category: 'bulletin',
    icon: Megaphone,
  },
  {
    key: 'incentiveTasks',
    label: 'Point Opportunities (Incentives)',
    shortLabel: 'Incentives',
    description: 'Active tasks and challenges students can complete to earn points.',
    category: 'bulletin',
    icon: Target,
  },
  {
    key: 'rewardsShowcase',
    label: 'Rewards to Chase',
    shortLabel: 'Rewards',
    description: 'Featured in-stock prizes and ticket costs from the school arcade shop.',
    category: 'bulletin',
    icon: Gift,
  },
];

/* -------------------------------------------------------------------------- */
/*                                THEME SYSTEM                                */
/* -------------------------------------------------------------------------- */

export type ThemeTone = 'dark' | 'light';

export type ModularThemeId =
  | 'midnight'
  | 'studio'
  | 'forest'
  | 'electric'
  | 'arcade'
  | 'cherry'
  | 'daylight'
  | 'cloud'
  | 'mint'
  | 'sunset'
  | 'lavender'
  | 'slate';

export type ModularThemeConfig = {
  id: ModularThemeId;
  name: string;
  tone: ThemeTone;
  description: string;
  previewBg: string;
  previewAccent: string;
  previewCard: string;
  // CSS styling classes
  pageClass: string;
  cardClass: string;
  textClass: string;
  quietClass: string;
  accentClass: string;
  badgeClass: string;
  heroBorderClass: string;
};

/** All themes divided strictly by Dark and Light with verified WCAG AA contrast */
export const MODULAR_THEMES: Record<ModularThemeId, ModularThemeConfig> = {
  // Dark Themes
  midnight: {
    id: 'midnight',
    name: 'Midnight Arcade',
    tone: 'dark',
    description: 'Deep midnight navy with elevated slate cards and glowing cyan accents',
    previewBg: '#0a0f1d',
    previewAccent: '#22d3ee',
    previewCard: '#0f172a',
    pageClass: 'bg-[#0a0f1d] text-white',
    cardClass: 'bg-slate-900/95 border-cyan-400/35 text-white shadow-xl shadow-cyan-950/40',
    textClass: 'text-white',
    quietClass: 'text-slate-300 font-medium',
    accentClass: 'text-cyan-400 font-bold',
    badgeClass: 'border-cyan-400/50 bg-cyan-950/80 text-cyan-200 font-semibold',
    heroBorderClass: 'border-cyan-400/40',
  },
  studio: {
    id: 'studio',
    name: 'Studio Noir',
    tone: 'dark',
    description: 'Theater marquee dark stone with warm amber gold highlights',
    previewBg: '#090806',
    previewAccent: '#fbbf24',
    previewCard: '#1c1917',
    pageClass: 'bg-[#090806] text-white',
    cardClass: 'bg-stone-900/95 border-amber-400/35 text-white shadow-xl shadow-black/60',
    textClass: 'text-white',
    quietClass: 'text-stone-300 font-medium',
    accentClass: 'text-amber-400 font-bold',
    badgeClass: 'border-amber-400/50 bg-amber-950/80 text-amber-200 font-semibold',
    heroBorderClass: 'border-amber-400/40',
  },
  forest: {
    id: 'forest',
    name: 'Deep Forest',
    tone: 'dark',
    description: 'Evergreen backdrop with crisp mint badges and emerald illumination',
    previewBg: '#052e16',
    previewAccent: '#34d399',
    previewCard: '#064e3b',
    pageClass: 'bg-[#03200f] text-emerald-50',
    cardClass: 'bg-[#052e16]/95 border-emerald-400/35 text-emerald-50 shadow-xl shadow-black/60',
    textClass: 'text-emerald-50',
    quietClass: 'text-emerald-200 font-medium',
    accentClass: 'text-emerald-400 font-bold',
    badgeClass: 'border-emerald-400/50 bg-emerald-950/80 text-emerald-200 font-semibold',
    heroBorderClass: 'border-emerald-400/40',
  },
  electric: {
    id: 'electric',
    name: 'Electric Azure',
    tone: 'dark',
    description: 'Deep cobalt sky with punchy electric cyan cards and glowing meters',
    previewBg: '#082f49',
    previewAccent: '#38bdf8',
    previewCard: '#0c4a6e',
    pageClass: 'bg-[#031d30] text-sky-50',
    cardClass: 'bg-[#082f49]/95 border-sky-400/35 text-sky-50 shadow-xl shadow-black/60',
    textClass: 'text-sky-50',
    quietClass: 'text-sky-200 font-medium',
    accentClass: 'text-sky-400 font-bold',
    badgeClass: 'border-sky-400/50 bg-sky-950/80 text-sky-200 font-semibold',
    heroBorderClass: 'border-sky-400/40',
  },
  arcade: {
    id: 'arcade',
    name: 'Cyber Violet',
    tone: 'dark',
    description: 'Retro game room violet with neon fuchsia and purple accents',
    previewBg: '#120822',
    previewAccent: '#e879f9',
    previewCard: '#240f42',
    pageClass: 'bg-[#0e061b] text-purple-50',
    cardClass: 'bg-[#1a0c33]/95 border-fuchsia-400/35 text-purple-50 shadow-xl shadow-black/60',
    textClass: 'text-purple-50',
    quietClass: 'text-purple-200 font-medium',
    accentClass: 'text-fuchsia-400 font-bold',
    badgeClass: 'border-fuchsia-400/50 bg-purple-950/80 text-purple-200 font-semibold',
    heroBorderClass: 'border-fuchsia-400/40',
  },
  cherry: {
    id: 'cherry',
    name: 'Cherry Velvet',
    tone: 'dark',
    description: 'Rich dark ruby with rose gold highlights and vibrant contrast',
    previewBg: '#2a0a14',
    previewAccent: '#fb7185',
    previewCard: '#4c1122',
    pageClass: 'bg-[#1e070e] text-rose-50',
    cardClass: 'bg-[#2a0a14]/95 border-rose-400/35 text-rose-50 shadow-xl shadow-black/60',
    textClass: 'text-rose-50',
    quietClass: 'text-rose-200 font-medium',
    accentClass: 'text-rose-400 font-bold',
    badgeClass: 'border-rose-400/50 bg-rose-950/80 text-rose-200 font-semibold',
    heroBorderClass: 'border-rose-400/40',
  },

  // Light Themes
  daylight: {
    id: 'daylight',
    name: 'Daylight Lobby',
    tone: 'light',
    description: 'Crisp bright white lobby style with royal blue borders and badges',
    previewBg: '#f8fafc',
    previewAccent: '#1d4ed8',
    previewCard: '#ffffff',
    pageClass: 'bg-[#f1f5f9] text-slate-950',
    cardClass: 'bg-white/95 border-slate-300/80 text-slate-950 shadow-lg shadow-slate-300/50',
    textClass: 'text-slate-950',
    quietClass: 'text-slate-600 font-medium',
    accentClass: 'text-blue-700 font-bold',
    badgeClass: 'border-blue-300 bg-blue-50 text-blue-900 font-semibold',
    heroBorderClass: 'border-blue-500',
  },
  cloud: {
    id: 'cloud',
    name: 'Cloud Blue',
    tone: 'light',
    description: 'Clean sky blue morning aesthetic with deep oceanic text and cards',
    previewBg: '#f0f9ff',
    previewAccent: '#0284c7',
    previewCard: '#ffffff',
    pageClass: 'bg-[#e0f2fe] text-sky-950',
    cardClass: 'bg-white/95 border-sky-300/80 text-sky-950 shadow-lg shadow-sky-200/50',
    textClass: 'text-sky-950',
    quietClass: 'text-sky-700 font-medium',
    accentClass: 'text-sky-700 font-bold',
    badgeClass: 'border-sky-300 bg-sky-50 text-sky-900 font-semibold',
    heroBorderClass: 'border-sky-500',
  },
  mint: {
    id: 'mint',
    name: 'Fresh Mint',
    tone: 'light',
    description: 'Inviting green hallway display with deep emerald contrast',
    previewBg: '#f0fdf4',
    previewAccent: '#059669',
    previewCard: '#ffffff',
    pageClass: 'bg-[#dcfce7] text-emerald-950',
    cardClass: 'bg-white/95 border-emerald-300/80 text-emerald-950 shadow-lg shadow-emerald-200/50',
    textClass: 'text-emerald-950',
    quietClass: 'text-emerald-700 font-medium',
    accentClass: 'text-emerald-700 font-bold',
    badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold',
    heroBorderClass: 'border-emerald-500',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    tone: 'light',
    description: 'Warm peach-coral glow with bold amber and orange highlights',
    previewBg: '#fff7ed',
    previewAccent: '#ea580c',
    previewCard: '#ffffff',
    pageClass: 'bg-[#ffedd5] text-amber-950',
    cardClass: 'bg-white/95 border-orange-300/80 text-amber-950 shadow-lg shadow-orange-200/50',
    textClass: 'text-amber-950',
    quietClass: 'text-amber-800 font-medium',
    accentClass: 'text-orange-700 font-bold',
    badgeClass: 'border-orange-300 bg-orange-50 text-orange-950 font-semibold',
    heroBorderClass: 'border-orange-500',
  },
  lavender: {
    id: 'lavender',
    name: 'Calm Lavender',
    tone: 'light',
    description: 'Gentle pastel purple with royal violet contrast and sharp typography',
    previewBg: '#faf5ff',
    previewAccent: '#7c3aed',
    previewCard: '#ffffff',
    pageClass: 'bg-[#f3e8ff] text-purple-950',
    cardClass: 'bg-white/95 border-purple-300/80 text-purple-950 shadow-lg shadow-purple-200/50',
    textClass: 'text-purple-950',
    quietClass: 'text-purple-700 font-medium',
    accentClass: 'text-purple-700 font-bold',
    badgeClass: 'border-purple-300 bg-purple-50 text-purple-950 font-semibold',
    heroBorderClass: 'border-purple-500',
  },
  slate: {
    id: 'slate',
    name: 'Neutral Slate',
    tone: 'light',
    description: 'Modern architectural gray with charcoal text and high-structure lines',
    previewBg: '#f1f5f9',
    previewAccent: '#334155',
    previewCard: '#ffffff',
    pageClass: 'bg-[#e2e8f0] text-slate-950',
    cardClass: 'bg-white/95 border-slate-300/90 text-slate-950 shadow-lg shadow-slate-300/50',
    textClass: 'text-slate-950',
    quietClass: 'text-slate-600 font-medium',
    accentClass: 'text-slate-800 font-bold',
    badgeClass: 'border-slate-300 bg-slate-100 text-slate-900 font-semibold',
    heroBorderClass: 'border-slate-600',
  },
};

export const DARK_THEMES = Object.values(MODULAR_THEMES).filter((t) => t.tone === 'dark');
export const LIGHT_THEMES = Object.values(MODULAR_THEMES).filter((t) => t.tone === 'light');

/* -------------------------------------------------------------------------- */
/*                             SCREEN CONFIG SCHEMA                           */
/* -------------------------------------------------------------------------- */

export type ScreenOrientation = 'landscape' | 'portrait';
export type ScreenLayoutMode = 'dashboard' | 'mirror' | 'grid';

export interface ModularScreenConfig {
  id: string;
  name: string;
  presetKey?: 'hall-of-fame' | 'smart-screen' | 'bulletin-board';
  description?: string;
  theme: ModularThemeId;
  orientation: ScreenOrientation;
  layout: ScreenLayoutMode;
  enabledModules: DisplayModuleKey[];
  heroModule?: DisplayModuleKey;
  customTitle?: string;
  customMessage?: string;
  isReadyMade?: boolean;
  createdAt: number;
  updatedAt: number;
}

/** 3 Ready-Made screens preconfigured to match the 3 classic templates */
export const READY_MADE_PRESET_SCREENS: Record<string, ModularScreenConfig> = {
  'hall-of-fame': {
    id: 'hall-of-fame',
    name: 'Hall of Fame',
    presetKey: 'hall-of-fame',
    description: 'Big-screen podium, top student rankings, class standings, and house totals.',
    theme: 'midnight',
    orientation: 'landscape',
    layout: 'mirror',
    enabledModules: [
      'podium',
      'studentLeaders',
      'classStandings',
      'houseStandings',
      'schoolGoal',
      'schoolStats',
    ],
    heroModule: 'podium',
    customTitle: 'Hall of Fame',
    customMessage: 'Celebrating our top scholars and community achievers!',
    isReadyMade: true,
    createdAt: 1,
    updatedAt: 1,
  },
  'smart-screen': {
    id: 'smart-screen',
    name: 'Smart Screen',
    presetKey: 'smart-screen',
    description: 'Hallway dashboard with digital clock, weather, daily focus, stats, and birthdays.',
    theme: 'daylight',
    orientation: 'landscape',
    layout: 'dashboard',
    enabledModules: [
      'clockDate',
      'weather',
      'schoolStats',
      'compliment',
      'quote',
      'birthdays',
      'studentLeaders',
      'houseStandings',
      'daySchedule',
    ],
    heroModule: 'clockDate',
    customTitle: 'Smart Screen',
    customMessage: 'Make today count! Learn, level up, and lead.',
    isReadyMade: true,
    createdAt: 2,
    updatedAt: 2,
  },
  'bulletin-board': {
    id: 'bulletin-board',
    name: 'Bulletin Board',
    presetKey: 'bulletin-board',
    description: 'Live celebration posts feed, point-earning challenges, and arcade rewards.',
    theme: 'studio',
    orientation: 'landscape',
    layout: 'grid',
    enabledModules: [
      'clockDate',
      'celebrationPosts',
      'incentiveTasks',
      'rewardsShowcase',
      'compliment',
    ],
    heroModule: 'celebrationPosts',
    customTitle: 'School Bulletin Board',
    customMessage: 'Complete opportunities to earn points and celebrate achievements!',
    isReadyMade: true,
    createdAt: 3,
    updatedAt: 3,
  },
};

export function resolveScreenTheme(themeId?: string | null): ModularThemeConfig {
  if (themeId && themeId in MODULAR_THEMES) {
    return MODULAR_THEMES[themeId as ModularThemeId];
  }
  return MODULAR_THEMES.midnight;
}

export function buildDefaultScreenConfig(
  id: string,
  name: string,
  starterPreset: 'hall-of-fame' | 'smart-screen' | 'bulletin-board' = 'hall-of-fame',
): ModularScreenConfig {
  const base = READY_MADE_PRESET_SCREENS[starterPreset];
  return {
    ...base,
    id,
    name,
    isReadyMade: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
