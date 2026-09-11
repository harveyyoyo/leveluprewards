export const SMART_SCREEN_THEME_IDS = [
  'daylight',
  'cloud',
  'mint',
  'sunset',
  'lavender',
  'slate',
  'midnight',
  'studio',
  'forest',
  'electric',
  'neon_gold',
  'hyper',
  'cherry',
  'arcade',
] as const;

export type SmartScreenTheme = (typeof SMART_SCREEN_THEME_IDS)[number];

export const DEFAULT_SMART_SCREEN_THEME: SmartScreenTheme = 'daylight';

export const SMART_SCREEN_THEME_OPTIONS: {
  id: SmartScreenTheme;
  label: string;
  description: string;
  tone: 'dark' | 'light';
}[] = [
  { id: 'daylight', label: 'Daylight', description: 'Bright lobby display', tone: 'light' },
  { id: 'cloud', label: 'Cloud', description: 'Soft sky blue', tone: 'light' },
  { id: 'mint', label: 'Mint Fresh', description: 'Clean green hallway', tone: 'light' },
  { id: 'sunset', label: 'Sunset', description: 'Warm coral glow', tone: 'light' },
  { id: 'lavender', label: 'Lavender', description: 'Calm purple tones', tone: 'light' },
  { id: 'slate', label: 'Slate', description: 'Neutral light gray', tone: 'light' },
  { id: 'midnight', label: 'Midnight', description: 'Deep blue signage', tone: 'dark' },
  { id: 'studio', label: 'Studio', description: 'Warm theater marquee', tone: 'dark' },
  { id: 'forest', label: 'Forest', description: 'Deep green nature', tone: 'dark' },
  { id: 'electric', label: 'Electric', description: 'Vivid cyan energy', tone: 'dark' },
  { id: 'neon_gold', label: 'Neon Gold', description: 'Bold amber arcade', tone: 'dark' },
  { id: 'hyper', label: 'Hyper', description: 'Purple-pink gradient', tone: 'dark' },
  { id: 'cherry', label: 'Cherry', description: 'Rich rose display', tone: 'dark' },
  { id: 'arcade', label: 'Arcade', description: 'Violet game-room vibe', tone: 'dark' },
];

const SMART_SCREEN_THEME_ID_SET = new Set<string>(SMART_SCREEN_THEME_IDS);

export function validSmartScreenTheme(value: string | null | undefined): SmartScreenTheme | null {
  if (!value || !SMART_SCREEN_THEME_ID_SET.has(value)) return null;
  return value as SmartScreenTheme;
}

export function resolveSmartScreenTheme(value: string | null | undefined): SmartScreenTheme {
  return validSmartScreenTheme(value) ?? DEFAULT_SMART_SCREEN_THEME;
}

type SmartScreenThemeTokens = {
  page: string;
  panel: string;
  quiet: string;
  accent: string;
  badge: string;
  rail: string;
  watermark: string;
};

type SmartScreenThemePageMeta = {
  pageBg: string;
  pageText: string;
  colorScheme: 'light' | 'dark';
};

export const SMART_SCREEN_THEME_PAGE_META: Record<SmartScreenTheme, SmartScreenThemePageMeta> = {
  daylight: { pageBg: '#f5f7fb', pageText: '#0f172a', colorScheme: 'light' },
  cloud: { pageBg: '#eef6ff', pageText: '#0c4a6e', colorScheme: 'light' },
  mint: { pageBg: '#ecfdf5', pageText: '#064e3b', colorScheme: 'light' },
  sunset: { pageBg: '#fff7ed', pageText: '#7c2d12', colorScheme: 'light' },
  lavender: { pageBg: '#faf5ff', pageText: '#4c1d95', colorScheme: 'light' },
  slate: { pageBg: '#f1f5f9', pageText: '#0f172a', colorScheme: 'light' },
  midnight: { pageBg: '#020817', pageText: '#ffffff', colorScheme: 'dark' },
  studio: { pageBg: '#090806', pageText: '#ffffff', colorScheme: 'dark' },
  forest: { pageBg: '#052e16', pageText: '#ecfdf5', colorScheme: 'dark' },
  electric: { pageBg: '#082f49', pageText: '#ecfeff', colorScheme: 'dark' },
  neon_gold: { pageBg: '#1c1408', pageText: '#fef3c7', colorScheme: 'dark' },
  hyper: { pageBg: '#1e1033', pageText: '#f5f3ff', colorScheme: 'dark' },
  cherry: { pageBg: '#2a0a14', pageText: '#fff1f2', colorScheme: 'dark' },
  arcade: { pageBg: '#120822', pageText: '#ede9fe', colorScheme: 'dark' },
};

export const SMART_SCREEN_THEME_CLASSES: Record<SmartScreenTheme, SmartScreenThemeTokens> = {
  daylight: {
    page: 'bg-[#f5f7fb] text-slate-950',
    panel: 'border-slate-200 bg-white/86 text-slate-950 shadow-slate-200/70',
    quiet: 'text-slate-500',
    accent: 'text-blue-700',
    badge: 'border-blue-200 bg-blue-50 text-blue-800',
    rail: 'bg-blue-600',
    watermark: 'border-slate-300/80 bg-white/80 text-slate-600',
  },
  cloud: {
    page: 'bg-[#eef6ff] text-sky-950',
    panel: 'border-sky-200 bg-white/88 text-sky-950 shadow-sky-200/60',
    quiet: 'text-sky-600',
    accent: 'text-sky-700',
    badge: 'border-sky-200 bg-sky-50 text-sky-800',
    rail: 'bg-sky-500',
    watermark: 'border-sky-200/80 bg-white/85 text-sky-700',
  },
  mint: {
    page: 'bg-[#ecfdf5] text-emerald-950',
    panel: 'border-emerald-200 bg-white/88 text-emerald-950 shadow-emerald-200/60',
    quiet: 'text-emerald-600',
    accent: 'text-emerald-700',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rail: 'bg-emerald-500',
    watermark: 'border-emerald-200/80 bg-white/85 text-emerald-700',
  },
  sunset: {
    page: 'bg-[#fff7ed] text-orange-950',
    panel: 'border-orange-200 bg-white/88 text-orange-950 shadow-orange-200/60',
    quiet: 'text-orange-600',
    accent: 'text-orange-700',
    badge: 'border-orange-200 bg-orange-50 text-orange-800',
    rail: 'bg-orange-500',
    watermark: 'border-orange-200/80 bg-white/85 text-orange-700',
  },
  lavender: {
    page: 'bg-[#faf5ff] text-violet-950',
    panel: 'border-violet-200 bg-white/88 text-violet-950 shadow-violet-200/60',
    quiet: 'text-violet-600',
    accent: 'text-violet-700',
    badge: 'border-violet-200 bg-violet-50 text-violet-800',
    rail: 'bg-violet-500',
    watermark: 'border-violet-200/80 bg-white/85 text-violet-700',
  },
  slate: {
    page: 'bg-[#f1f5f9] text-slate-950',
    panel: 'border-slate-300 bg-white/90 text-slate-950 shadow-slate-300/60',
    quiet: 'text-slate-500',
    accent: 'text-slate-700',
    badge: 'border-slate-300 bg-slate-100 text-slate-800',
    rail: 'bg-slate-600',
    watermark: 'border-slate-300/80 bg-white/85 text-slate-600',
  },
  midnight: {
    page: 'bg-[#020817] text-white',
    panel: 'border-cyan-200/25 bg-slate-950/88 text-white shadow-black/30',
    quiet: 'text-cyan-50/85',
    accent: 'text-cyan-100',
    badge: 'border-cyan-100/35 bg-cyan-100/16 text-white',
    rail: 'bg-cyan-200',
    watermark: 'border-white/10 bg-black/20 text-white/75',
  },
  studio: {
    page: 'bg-[#090806] text-white',
    panel: 'border-amber-100/25 bg-stone-950/90 text-white shadow-black/30',
    quiet: 'text-amber-50/82',
    accent: 'text-amber-100',
    badge: 'border-amber-100/35 bg-amber-100/14 text-white',
    rail: 'bg-amber-200',
    watermark: 'border-white/10 bg-black/20 text-white/75',
  },
  forest: {
    page: 'bg-[#052e16] text-emerald-50',
    panel: 'border-emerald-300/25 bg-emerald-950/88 text-emerald-50 shadow-black/30',
    quiet: 'text-emerald-100/80',
    accent: 'text-emerald-200',
    badge: 'border-emerald-200/35 bg-emerald-200/12 text-emerald-50',
    rail: 'bg-emerald-300',
    watermark: 'border-emerald-200/15 bg-black/20 text-emerald-100/75',
  },
  electric: {
    page: 'bg-[#082f49] text-cyan-50',
    panel: 'border-cyan-300/25 bg-sky-950/88 text-cyan-50 shadow-black/30',
    quiet: 'text-cyan-100/80',
    accent: 'text-cyan-200',
    badge: 'border-cyan-200/35 bg-cyan-200/12 text-cyan-50',
    rail: 'bg-cyan-300',
    watermark: 'border-cyan-200/15 bg-black/20 text-cyan-100/75',
  },
  neon_gold: {
    page: 'bg-[#1c1408] text-amber-50',
    panel: 'border-amber-200/30 bg-amber-950/88 text-amber-50 shadow-black/30',
    quiet: 'text-amber-100/80',
    accent: 'text-amber-200',
    badge: 'border-amber-200/35 bg-amber-200/12 text-amber-50',
    rail: 'bg-amber-300',
    watermark: 'border-amber-200/15 bg-black/20 text-amber-100/75',
  },
  hyper: {
    page: 'bg-[#1e1033] text-violet-50',
    panel: 'border-fuchsia-300/25 bg-violet-950/88 text-violet-50 shadow-black/30',
    quiet: 'text-violet-100/80',
    accent: 'text-fuchsia-200',
    badge: 'border-fuchsia-200/35 bg-fuchsia-200/12 text-violet-50',
    rail: 'bg-fuchsia-300',
    watermark: 'border-fuchsia-200/15 bg-black/20 text-violet-100/75',
  },
  cherry: {
    page: 'bg-[#2a0a14] text-rose-50',
    panel: 'border-rose-300/25 bg-rose-950/88 text-rose-50 shadow-black/30',
    quiet: 'text-rose-100/80',
    accent: 'text-rose-200',
    badge: 'border-rose-200/35 bg-rose-200/12 text-rose-50',
    rail: 'bg-rose-300',
    watermark: 'border-rose-200/15 bg-black/20 text-rose-100/75',
  },
  arcade: {
    page: 'bg-[#120822] text-violet-50',
    panel: 'border-violet-300/25 bg-violet-950/88 text-violet-50 shadow-black/30',
    quiet: 'text-violet-100/80',
    accent: 'text-violet-200',
    badge: 'border-violet-200/35 bg-violet-200/12 text-violet-50',
    rail: 'bg-violet-300',
    watermark: 'border-violet-200/15 bg-black/20 text-violet-100/75',
  },
};
