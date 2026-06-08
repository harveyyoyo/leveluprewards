import { cn } from '@/lib/utils';

export type BulletinBoardIncentiveRecord = {
  id: string;
  title: string;
  description: string;
  points: number;
  icon?: string;
  category?: string;
  active?: boolean;
  createdAt?: number;
  updatedAt?: number;
};

export const BULLETIN_THEME_IDS = [
  'default',
  'neon_gold',
  'hyper_gradient',
  'electric',
  'glassmorphic',
  'forest',
  'sunset',
  'midnight',
] as const;

export type BulletinThemeId = (typeof BULLETIN_THEME_IDS)[number];

export type BulletinThemePreset = {
  id: BulletinThemeId;
  name: string;
  pageClassName: string;
  cardClassName: string;
  accentBorderClassName: string;
  itemClassName: string;
};

export const PRESET_BULLETIN_THEMES: BulletinThemePreset[] = [
  {
    id: 'default',
    name: 'Classic Neutral',
    pageClassName: 'bg-slate-100 dark:bg-slate-950',
    cardClassName: 'bg-card/95 border-border text-foreground',
    accentBorderClassName: 'border-t-indigo-500',
    itemClassName:
      'bg-white/70 dark:bg-black/25 border-white/30 dark:border-white/10',
  },
  {
    id: 'neon_gold',
    name: 'Neon Gold',
    pageClassName: 'bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950',
    cardClassName:
      'bg-gradient-to-br from-amber-200/80 via-amber-100/70 to-orange-100/60 border-amber-400/70 text-amber-950 dark:from-amber-900/90 dark:via-amber-950/80 dark:to-orange-950/70 dark:border-amber-500/50 dark:text-amber-50',
    accentBorderClassName: 'border-t-amber-500',
    itemClassName: 'bg-amber-50/80 dark:bg-amber-950/50 border-amber-300/50 dark:border-amber-700/40',
  },
  {
    id: 'hyper_gradient',
    name: 'Hyper Gradient',
    pageClassName: 'bg-gradient-to-tr from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950',
    cardClassName:
      'bg-gradient-to-tr from-indigo-200/75 via-purple-200/70 to-pink-200/65 border-purple-400/70 text-indigo-950 dark:from-indigo-900/85 dark:via-purple-900/80 dark:to-pink-900/75 dark:border-purple-500/50 dark:text-indigo-50',
    accentBorderClassName: 'border-t-purple-500',
    itemClassName: 'bg-purple-50/80 dark:bg-purple-950/50 border-purple-300/50 dark:border-purple-700/40',
  },
  {
    id: 'electric',
    name: 'Electric Azure',
    pageClassName: 'bg-gradient-to-br from-cyan-100 via-sky-50 to-blue-100 dark:from-cyan-950 dark:via-sky-950 dark:to-blue-950',
    cardClassName:
      'bg-gradient-to-br from-cyan-200/75 via-sky-100/70 to-blue-100/65 border-cyan-400/70 text-cyan-950 dark:from-cyan-900/85 dark:via-sky-900/80 dark:to-blue-900/75 dark:border-cyan-500/50 dark:text-cyan-50',
    accentBorderClassName: 'border-t-cyan-500',
    itemClassName: 'bg-cyan-50/80 dark:bg-cyan-950/50 border-cyan-300/50 dark:border-cyan-700/40',
  },
  {
    id: 'glassmorphic',
    name: 'Glassmorphic',
    pageClassName: 'bg-gradient-to-br from-slate-200 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900',
    cardClassName:
      'bg-white/55 dark:bg-slate-950/55 backdrop-blur-xl border-white/40 dark:border-white/15 text-slate-900 dark:text-slate-100',
    accentBorderClassName: 'border-t-slate-400 dark:border-t-slate-500',
    itemClassName: 'bg-white/50 dark:bg-white/10 border-white/40 dark:border-white/15 backdrop-blur-sm',
  },
  {
    id: 'forest',
    name: 'Forest Grove',
    pageClassName: 'bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950',
    cardClassName:
      'bg-gradient-to-br from-emerald-200/75 via-green-100/70 to-teal-100/65 border-emerald-400/70 text-emerald-950 dark:from-emerald-900/85 dark:via-green-900/80 dark:to-teal-900/75 dark:border-emerald-500/50 dark:text-emerald-50',
    accentBorderClassName: 'border-t-emerald-500',
    itemClassName: 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-300/50 dark:border-emerald-700/40',
  },
  {
    id: 'sunset',
    name: 'Sunset Coral',
    pageClassName: 'bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 dark:from-rose-950 dark:via-orange-950 dark:to-amber-950',
    cardClassName:
      'bg-gradient-to-br from-rose-200/75 via-orange-100/70 to-amber-100/65 border-rose-400/70 text-rose-950 dark:from-rose-900/85 dark:via-orange-900/80 dark:to-amber-900/75 dark:border-rose-500/50 dark:text-rose-50',
    accentBorderClassName: 'border-t-rose-500',
    itemClassName: 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-300/50 dark:border-rose-700/40',
  },
  {
    id: 'midnight',
    name: 'Midnight Arcade',
    pageClassName: 'bg-gradient-to-b from-slate-900 via-violet-950 to-slate-950',
    cardClassName:
      'bg-gradient-to-b from-slate-800/95 via-violet-950/90 to-slate-950/95 border-violet-500/45 text-violet-50',
    accentBorderClassName: 'border-t-violet-500',
    itemClassName: 'bg-violet-950/60 border-violet-700/40 text-violet-50',
  },
];

export const PRESET_BULLETIN_INCENTIVES: {
  title: string;
  description: string;
  points: number;
  icon: string;
  category: string;
}[] = [
  {
    title: 'Perfect Attendance',
    description: 'No absences or tardies this month.',
    points: 100,
    icon: '\u{1F4C5}',
    category: 'Attendance',
  },
  {
    title: 'Homework Hero',
    description: 'Submit all homework assignments fully complete.',
    points: 50,
    icon: '\u{1F4DA}',
    category: 'Homework',
  },
  {
    title: 'Good Citizen',
    description: 'Help a peer in need or show outstanding kindness.',
    points: 120,
    icon: '\u{1F91D}',
    category: 'Classroom',
  },
  {
    title: 'Participation Star',
    description: 'Actively participate and ask questions in class.',
    points: 40,
    icon: '\u{1F64B}',
    category: 'Engagement',
  },
  {
    title: 'Hallway Helper',
    description: 'Help clean up the hallway or maintain the school grounds.',
    points: 80,
    icon: '\u{1F9F9}',
    category: 'Service',
  },
  {
    title: 'Math Whiz',
    description: 'Complete extra credit or show measurable growth in math.',
    points: 75,
    icon: '\u{1F522}',
    category: 'Academics',
  },
  {
    title: 'Reading Champion',
    description: 'Meet reading goals or finish a grade-level book list.',
    points: 60,
    icon: '\u{1F4D6}',
    category: 'Literacy',
  },
  {
    title: 'Science Explorer',
    description: 'Lead a lab team or complete an outstanding science project.',
    points: 70,
    icon: '\u{1F52C}',
    category: 'STEM',
  },
  {
    title: 'Creative Showcase',
    description: 'Present artwork, music, or writing at a school event.',
    points: 90,
    icon: '\u{1F3A8}',
    category: 'Arts',
  },
  {
    title: 'Sportsmanship Award',
    description: 'Demonstrate fair play and encouragement during PE or games.',
    points: 55,
    icon: '\u{26BD}',
    category: 'Athletics',
  },
  {
    title: 'Tech Helper',
    description: 'Assist classmates or staff with devices or classroom tech.',
    points: 45,
    icon: '\u{1F4BB}',
    category: 'Technology',
  },
  {
    title: 'Lunchroom Leader',
    description: 'Keep your table tidy and follow cafeteria expectations.',
    points: 35,
    icon: '\u{1F34E}',
    category: 'Community',
  },
  {
    title: 'Goal Crusher',
    description: 'Hit a personal academic or behavior goal set with your teacher.',
    points: 85,
    icon: '\u{1F3AF}',
    category: 'Growth',
  },
  {
    title: 'Safety Patrol',
    description: 'Follow safety rules and help others do the same.',
    points: 50,
    icon: '\u{1F9BA}',
    category: 'Safety',
  },
  {
    title: 'Bilingual Buddy',
    description: 'Support a classmate with language learning or translation.',
    points: 65,
    icon: '\u{1F310}',
    category: 'Inclusion',
  },
];

const PRESET_BY_ID = Object.fromEntries(PRESET_BULLETIN_THEMES.map((t) => [t.id, t])) as Record<
  BulletinThemeId,
  BulletinThemePreset
>;

export function getBulletinThemePreset(themeId: string | undefined): BulletinThemePreset {
  const id = (themeId || 'default') as BulletinThemeId;
  return PRESET_BY_ID[id] ?? PRESET_BY_ID.default;
}

/** Outer card classes for the bulletin board shell (Board page and admin preview). */
export function getBulletinBoardCardClassName(themeId: string | undefined): string {
  const preset = getBulletinThemePreset(themeId);
  return cn(
    'overflow-hidden border shadow-xl relative transition-all duration-300 border-t-8 backdrop-blur-md',
    preset.accentBorderClassName,
    preset.cardClassName,
  );
}

/** Page background behind the bulletin board card. */
export function getBulletinBoardPageClassName(themeId: string | undefined): string {
  return getBulletinThemePreset(themeId).pageClassName;
}

/** Inner incentive / celebration row styling. */
export function getBulletinBoardItemClassName(themeId: string | undefined): string {
  const preset = getBulletinThemePreset(themeId);
  return cn('rounded-2xl border flex items-center justify-between gap-3 shadow-sm', preset.itemClassName);
}

/** Used when `bulletinSubtitle` is empty in school settings. */
export const DEFAULT_BULLETIN_SUBTITLE = 'Visual reminders and incentives for earning points!';

export const BULLETIN_EMOJI_SUGGESTIONS = [
  '\u{1F389}',
  '\u{1F4C5}',
  '\u{1F4DA}',
  '\u{1F91D}',
  '\u{1F64B}',
  '\u{1F9F9}',
  '\u{1F522}',
  '\u{1F4D6}',
  '\u{1F52C}',
  '\u{1F3A8}',
  '\u{26BD}',
  '\u{1F4BB}',
  '\u{1F34E}',
  '\u{1F3AF}',
  '\u{1F9BA}',
  '\u{1F310}',
  '\u{2B50}',
  '\u{1F3C6}',
  '\u{1F4A1}',
  '\u{1F31F}',
  '\u{1F393}',
  '\u{2764}\u{FE0F}',
  '\u{1F680}',
  '\u{1F3C5}',
];

export type BulletinLogoSize = 'sm' | 'md' | 'lg';

export function bulletinLogoBoxClass(size: BulletinLogoSize | undefined): string {
  switch (size) {
    case 'lg':
      return 'w-14 h-14 rounded-2xl text-2xl';
    case 'sm':
      return 'w-8 h-8 rounded-lg text-lg';
    case 'md':
    default:
      return 'w-10 h-10 rounded-xl text-xl';
  }
}
