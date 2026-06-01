export type SmartScreenTheme = 'midnight' | 'daylight' | 'studio';

export const SMART_SCREEN_THEME_OPTIONS: {
  id: SmartScreenTheme;
  label: string;
  description: string;
  tone: 'dark' | 'light';
}[] = [
  { id: 'midnight', label: 'Midnight', description: 'Deep blue signage', tone: 'dark' },
  { id: 'daylight', label: 'Daylight', description: 'Bright lobby display', tone: 'light' },
  { id: 'studio', label: 'Studio', description: 'Warm theater marquee', tone: 'dark' },
];

export function validSmartScreenTheme(value: string | null | undefined): SmartScreenTheme | null {
  return value === 'midnight' || value === 'daylight' || value === 'studio' ? value : null;
}

export const SMART_SCREEN_THEME_CLASSES = {
  midnight: {
    page: 'bg-[#020817] text-white',
    panel: 'border-cyan-200/25 bg-slate-950/88 text-white shadow-black/30',
    quiet: 'text-cyan-50/85',
    accent: 'text-cyan-100',
    badge: 'border-cyan-100/35 bg-cyan-100/16 text-white',
    rail: 'bg-cyan-200',
    watermark: 'border-white/10 bg-black/20 text-white/75',
  },
  daylight: {
    page: 'bg-[#f5f7fb] text-slate-950',
    panel: 'border-slate-200 bg-white/86 text-slate-950 shadow-slate-200/70',
    quiet: 'text-slate-500',
    accent: 'text-blue-700',
    badge: 'border-blue-200 bg-blue-50 text-blue-800',
    rail: 'bg-blue-600',
    watermark: 'border-slate-300/80 bg-white/80 text-slate-600',
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
} as const;
