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
  Monitor,
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
  statCardClass: string;
  meterFillClass: string;
};

/** All themes divided strictly by Dark and Light with verified WCAG AA contrast */
export const MODULAR_THEMES: Record<ModularThemeId, ModularThemeConfig> = {
  // Dark Themes
  midnight: {
    id: 'midnight',
    name: 'Midnight Cyber',
    tone: 'dark',
    description: 'Deep midnight navy with elevated cobalt cards and radiant cyan accents',
    previewBg: '#070b16',
    previewAccent: '#38bdf8',
    previewCard: '#131f38',
    pageClass: 'bg-[#070b16] text-white',
    cardClass: 'bg-[#131f38] border-2 border-cyan-400/50 text-white shadow-2xl shadow-black/80',
    textClass: 'text-white',
    quietClass: 'text-slate-200 font-semibold',
    accentClass: 'text-cyan-300 font-black',
    badgeClass: 'border-2 border-cyan-400 bg-cyan-950 text-cyan-100 font-black shadow-sm',
    heroBorderClass: 'border-cyan-300 shadow-[0_0_20px_rgba(56,189,248,0.25)]',
    statCardClass: 'bg-[#1b2b4d] border-2 border-cyan-400/60 text-white shadow-lg',
    meterFillClass: 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 shadow-md shadow-cyan-400/30',
  },
  studio: {
    id: 'studio',
    name: 'Studio Noir',
    tone: 'dark',
    description: 'Theater marquee dark stone with glowing gold pedestals and crisp white text',
    previewBg: '#0c0a09',
    previewAccent: '#fbbf24',
    previewCard: '#211d1a',
    pageClass: 'bg-[#0c0a09] text-white',
    cardClass: 'bg-[#211d1a] border-2 border-amber-400/50 text-white shadow-2xl shadow-black/80',
    textClass: 'text-white',
    quietClass: 'text-stone-200 font-semibold',
    accentClass: 'text-amber-300 font-black',
    badgeClass: 'border-2 border-amber-400 bg-amber-950 text-amber-100 font-black shadow-sm',
    heroBorderClass: 'border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.25)]',
    statCardClass: 'bg-[#2e2823] border-2 border-amber-400/60 text-white shadow-lg',
    meterFillClass: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-md shadow-amber-400/30',
  },
  forest: {
    id: 'forest',
    name: 'Deep Forest',
    tone: 'dark',
    description: 'Rich dark emerald backdrop with crisp mint highlights and elevated green cards',
    previewBg: '#02180b',
    previewAccent: '#34d399',
    previewCard: '#0d361c',
    pageClass: 'bg-[#02180b] text-white',
    cardClass: 'bg-[#0d361c] border-2 border-emerald-400/50 text-white shadow-2xl shadow-black/80',
    textClass: 'text-white',
    quietClass: 'text-emerald-100 font-semibold',
    accentClass: 'text-emerald-300 font-black',
    badgeClass: 'border-2 border-emerald-400 bg-emerald-950 text-emerald-100 font-black shadow-sm',
    heroBorderClass: 'border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.25)]',
    statCardClass: 'bg-[#134927] border-2 border-emerald-400/60 text-white shadow-lg',
    meterFillClass: 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 shadow-md shadow-emerald-400/30',
  },
  electric: {
    id: 'electric',
    name: 'Electric Azure',
    tone: 'dark',
    description: 'Deep cobalt sky with punchy electric sky blue cards and vivid illumination',
    previewBg: '#031628',
    previewAccent: '#38bdf8',
    previewCard: '#0d2e4f',
    pageClass: 'bg-[#031628] text-white',
    cardClass: 'bg-[#0d2e4f] border-2 border-sky-400/50 text-white shadow-2xl shadow-black/80',
    textClass: 'text-white',
    quietClass: 'text-sky-100 font-semibold',
    accentClass: 'text-sky-300 font-black',
    badgeClass: 'border-2 border-sky-400 bg-sky-950 text-sky-100 font-black shadow-sm',
    heroBorderClass: 'border-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.25)]',
    statCardClass: 'bg-[#133e69] border-2 border-sky-400/60 text-white shadow-lg',
    meterFillClass: 'bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 shadow-md shadow-sky-400/30',
  },
  arcade: {
    id: 'arcade',
    name: 'Cyber Violet',
    tone: 'dark',
    description: 'Retro game room deep purple with vibrant fuchsia cards and neon illumination',
    previewBg: '#110522',
    previewAccent: '#e879f9',
    previewCard: '#271247',
    pageClass: 'bg-[#110522] text-white',
    cardClass: 'bg-[#271247] border-2 border-fuchsia-400/50 text-white shadow-2xl shadow-black/80',
    textClass: 'text-white',
    quietClass: 'text-purple-100 font-semibold',
    accentClass: 'text-fuchsia-300 font-black',
    badgeClass: 'border-2 border-fuchsia-400 bg-purple-950 text-purple-100 font-black shadow-sm',
    heroBorderClass: 'border-fuchsia-300 shadow-[0_0_20px_rgba(232,121,249,0.25)]',
    statCardClass: 'bg-[#371a63] border-2 border-fuchsia-400/60 text-white shadow-lg',
    meterFillClass: 'bg-gradient-to-r from-fuchsia-400 via-pink-400 to-purple-500 shadow-md shadow-fuchsia-400/30',
  },
  cherry: {
    id: 'cherry',
    name: 'Cherry Velvet',
    tone: 'dark',
    description: 'Rich dark burgundy with elevated ruby cards and punchy rose accents',
    previewBg: '#1c030c',
    previewAccent: '#fb7185',
    previewCard: '#3b0b1c',
    pageClass: 'bg-[#1c030c] text-white',
    cardClass: 'bg-[#3b0b1c] border-2 border-rose-400/50 text-white shadow-2xl shadow-black/80',
    textClass: 'text-white',
    quietClass: 'text-rose-100 font-semibold',
    accentClass: 'text-rose-300 font-black',
    badgeClass: 'border-2 border-rose-400 bg-rose-950 text-rose-100 font-black shadow-sm',
    heroBorderClass: 'border-rose-300 shadow-[0_0_20px_rgba(251,113,133,0.25)]',
    statCardClass: 'bg-[#4f1127] border-2 border-rose-400/60 text-white shadow-lg',
    meterFillClass: 'bg-gradient-to-r from-rose-400 via-pink-400 to-red-500 shadow-md shadow-rose-400/30',
  },

  // Light Themes (crisp white cards, bold borders, 14:1 contrast ratios)
  daylight: {
    id: 'daylight',
    name: 'Daylight Lobby',
    tone: 'light',
    description: 'Crisp bright white lobby style with royal blue borders and high contrast text',
    previewBg: '#e2e8f0',
    previewAccent: '#1d4ed8',
    previewCard: '#ffffff',
    pageClass: 'bg-[#e2e8f0] text-slate-950',
    cardClass: 'bg-white border-2 border-slate-300 text-slate-950 shadow-xl shadow-slate-300/60',
    textClass: 'text-slate-950',
    quietClass: 'text-slate-700 font-semibold',
    accentClass: 'text-blue-700 font-black',
    badgeClass: 'border-2 border-blue-600 bg-blue-100 text-blue-950 font-black shadow-sm',
    heroBorderClass: 'border-blue-600 shadow-lg shadow-blue-500/10',
    statCardClass: 'bg-blue-50/80 border-2 border-blue-300 text-slate-950 shadow-md',
    meterFillClass: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-sm',
  },
  cloud: {
    id: 'cloud',
    name: 'Cloud Blue',
    tone: 'light',
    description: 'Clean sky blue morning aesthetic with deep oceanic text and crisp white cards',
    previewBg: '#bae6fd',
    previewAccent: '#0369a1',
    previewCard: '#ffffff',
    pageClass: 'bg-[#bae6fd] text-sky-950',
    cardClass: 'bg-white border-2 border-sky-300 text-sky-950 shadow-xl shadow-sky-200/60',
    textClass: 'text-sky-950',
    quietClass: 'text-sky-800 font-semibold',
    accentClass: 'text-sky-700 font-black',
    badgeClass: 'border-2 border-sky-600 bg-sky-100 text-sky-950 font-black shadow-sm',
    heroBorderClass: 'border-sky-600 shadow-lg shadow-sky-500/10',
    statCardClass: 'bg-sky-50/80 border-2 border-sky-300 text-sky-950 shadow-md',
    meterFillClass: 'bg-gradient-to-r from-sky-600 via-blue-600 to-sky-700 shadow-sm',
  },
  mint: {
    id: 'mint',
    name: 'Fresh Mint',
    tone: 'light',
    description: 'Inviting green hallway display with deep emerald contrast and bright surfaces',
    previewBg: '#bbf7d0',
    previewAccent: '#047857',
    previewCard: '#ffffff',
    pageClass: 'bg-[#bbf7d0] text-emerald-950',
    cardClass: 'bg-white border-2 border-emerald-300 text-emerald-950 shadow-xl shadow-emerald-200/60',
    textClass: 'text-emerald-950',
    quietClass: 'text-emerald-800 font-semibold',
    accentClass: 'text-emerald-700 font-black',
    badgeClass: 'border-2 border-emerald-600 bg-emerald-100 text-emerald-950 font-black shadow-sm',
    heroBorderClass: 'border-emerald-600 shadow-lg shadow-emerald-500/10',
    statCardClass: 'bg-emerald-50/80 border-2 border-emerald-300 text-emerald-950 shadow-md',
    meterFillClass: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 shadow-sm',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    tone: 'light',
    description: 'Warm peach-coral glow with bold amber and orange highlights and sharp dark text',
    previewBg: '#fed7aa',
    previewAccent: '#c2410c',
    previewCard: '#ffffff',
    pageClass: 'bg-[#fed7aa] text-amber-950',
    cardClass: 'bg-white border-2 border-orange-300 text-amber-950 shadow-xl shadow-orange-200/60',
    textClass: 'text-amber-950',
    quietClass: 'text-amber-800 font-semibold',
    accentClass: 'text-orange-700 font-black',
    badgeClass: 'border-2 border-orange-600 bg-orange-100 text-orange-950 font-black shadow-sm',
    heroBorderClass: 'border-orange-600 shadow-lg shadow-orange-500/10',
    statCardClass: 'bg-orange-50/80 border-2 border-orange-300 text-amber-950 shadow-md',
    meterFillClass: 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 shadow-sm',
  },
  lavender: {
    id: 'lavender',
    name: 'Calm Lavender',
    tone: 'light',
    description: 'Gentle pastel purple with royal violet contrast and sharp typography',
    previewBg: '#e9d5ff',
    previewAccent: '#6d28d9',
    previewCard: '#ffffff',
    pageClass: 'bg-[#e9d5ff] text-purple-950',
    cardClass: 'bg-white border-2 border-purple-300 text-purple-950 shadow-xl shadow-purple-200/60',
    textClass: 'text-purple-950',
    quietClass: 'text-purple-800 font-semibold',
    accentClass: 'text-purple-700 font-black',
    badgeClass: 'border-2 border-purple-600 bg-purple-100 text-purple-950 font-black shadow-sm',
    heroBorderClass: 'border-purple-600 shadow-lg shadow-purple-500/10',
    statCardClass: 'bg-purple-50/80 border-2 border-purple-300 text-purple-950 shadow-md',
    meterFillClass: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 shadow-sm',
  },
  slate: {
    id: 'slate',
    name: 'Neutral Slate',
    tone: 'light',
    description: 'Modern architectural gray with deep charcoal text and high-structure lines',
    previewBg: '#cbd5e1',
    previewAccent: '#1e293b',
    previewCard: '#ffffff',
    pageClass: 'bg-[#cbd5e1] text-slate-950',
    cardClass: 'bg-white border-2 border-slate-400 text-slate-950 shadow-xl shadow-slate-300/60',
    textClass: 'text-slate-950',
    quietClass: 'text-slate-700 font-semibold',
    accentClass: 'text-slate-900 font-black',
    badgeClass: 'border-2 border-slate-800 bg-slate-200 text-slate-950 font-black shadow-sm',
    heroBorderClass: 'border-slate-800 shadow-lg shadow-slate-500/10',
    statCardClass: 'bg-slate-100 border-2 border-slate-300 text-slate-950 shadow-md',
    meterFillClass: 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 shadow-sm',
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
  autoScroll?: boolean;
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
    autoScroll: true,
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

/* -------------------------------------------------------------------------- */
/*                          PRESET METADATA & RECIPES                         */
/* -------------------------------------------------------------------------- */

export type PresetKey = 'hall-of-fame' | 'smart-screen' | 'bulletin-board';

export interface DisplayPresetMeta {
  key: PresetKey;
  name: string;
  tagline: string;
  description: string;
  accentColor: 'amber' | 'sky' | 'purple';
  accentHex: string;
  badgeLabel: string;
  icon: LucideIcon;
  defaultTheme: ModularThemeId;
  defaultModulesCount: number;
  highlightModules: string[];
}

export const DISPLAY_PRESET_CATALOG: readonly DisplayPresetMeta[] = [
  {
    key: 'hall-of-fame',
    name: 'Hall of Fame',
    tagline: 'Podium & Leaderboards',
    description: 'Gold podium for top scholars, live student point rankings, class standings, house points, and school milestone.',
    accentColor: 'amber',
    accentHex: '#f59e0b',
    badgeLabel: 'Recognition',
    icon: Crown,
    defaultTheme: 'midnight',
    defaultModulesCount: 6,
    highlightModules: ['Podium', 'Top Students', 'House Standings', 'School Goal'],
  },
  {
    key: 'smart-screen',
    name: 'Smart Screen',
    tagline: 'Daily Routine & Info Hub',
    description: 'Dynamic morning lobby dashboard with digital clock, local weather, daily schedule, focus skill, and birthday spotlight.',
    accentColor: 'sky',
    accentHex: '#0ea5e9',
    badgeLabel: 'Daily Hub',
    icon: Monitor,
    defaultTheme: 'daylight',
    defaultModulesCount: 9,
    highlightModules: ['Clock & Date', 'Live Weather', 'Daily Schedule', 'Birthdays'],
  },
  {
    key: 'bulletin-board',
    name: 'Bulletin Board',
    tagline: 'Community & Rewards',
    description: 'Live celebration shoutouts ticker, active point-earning challenges (incentives), and arcade reward catalog showcase.',
    accentColor: 'purple',
    accentHex: '#a855f7',
    badgeLabel: 'Rewards & Praise',
    icon: Megaphone,
    defaultTheme: 'studio',
    defaultModulesCount: 5,
    highlightModules: ['Celebration Posts', 'Point Incentives', 'Rewards Showcase'],
  },
];

export interface CuratedMixRecipe {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  theme: ModularThemeId;
  modules: DisplayModuleKey[];
  badge: string;
}

export const CURATED_MIX_RECIPES: readonly CuratedMixRecipe[] = [
  {
    id: 'mega-hub',
    name: 'All-in-One Mega Hub',
    subtitle: 'The Ultimate Hallway TV',
    description: 'Blends the best of all 3: Podium, Clock & Weather, Top Students, Celebrations, and Reward Shop.',
    icon: Sparkles,
    theme: 'midnight',
    badge: 'Popular Remix',
    modules: [
      'clockDate',
      'weather',
      'podium',
      'studentLeaders',
      'celebrationPosts',
      'rewardsShowcase',
      'schoolGoal',
    ],
  },
  {
    id: 'morning-routine',
    name: 'Morning Arrival & Culture',
    subtitle: 'Warm Welcoming Info Hub',
    description: 'Starts the day strong with Clock, Weather, Schedule, Today’s Compliment, Focus Skill, and Birthdays.',
    icon: Heart,
    theme: 'daylight',
    badge: 'Culture & Daily',
    modules: [
      'clockDate',
      'weather',
      'daySchedule',
      'compliment',
      'focusSkill',
      'birthdays',
      'quote',
    ],
  },
  {
    id: 'arcade-arena',
    name: 'Arcade & Quests Arena',
    subtitle: 'Gamified Motivation',
    description: 'Puts point-earning front and center: Podium, House Standings, Active Challenges, and Prizes to chase.',
    icon: Trophy,
    theme: 'electric',
    badge: 'Arcade Rewards',
    modules: [
      'podium',
      'studentLeaders',
      'houseStandings',
      'incentiveTasks',
      'rewardsShowcase',
      'schoolGoal',
    ],
  },
];

