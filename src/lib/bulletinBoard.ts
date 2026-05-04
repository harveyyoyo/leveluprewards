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

export const PRESET_BULLETIN_THEMES: { id: BulletinThemeId; name: string; className: string }[] = [
  {
    id: 'default',
    name: 'Classic Neutral',
    className:
      'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100',
  },
  {
    id: 'neon_gold',
    name: 'Neon Gold',
    className:
      'bg-gradient-to-br from-amber-500/10 via-amber-600/10 to-transparent border-amber-500/40 text-amber-950 dark:text-amber-50',
  },
  {
    id: 'hyper_gradient',
    name: 'Hyper Gradient',
    className:
      'bg-gradient-to-tr from-indigo-500/15 via-purple-500/15 to-pink-500/15 border-purple-500/40 text-indigo-950 dark:text-indigo-50',
  },
  {
    id: 'electric',
    name: 'Electric Azure',
    className:
      'bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-transparent border-cyan-400/40 text-cyan-950 dark:text-cyan-50',
  },
  {
    id: 'glassmorphic',
    name: 'Glassmorphic',
    className:
      'bg-white/40 dark:bg-slate-950/40 backdrop-blur-md border-white/20 dark:border-white/10 text-slate-800 dark:text-slate-200',
  },
  {
    id: 'forest',
    name: 'Forest Grove',
    className:
      'bg-gradient-to-br from-emerald-600/12 via-green-700/10 to-transparent border-emerald-500/35 text-emerald-950 dark:text-emerald-50',
  },
  {
    id: 'sunset',
    name: 'Sunset Coral',
    className:
      'bg-gradient-to-br from-rose-500/12 via-orange-500/10 to-amber-400/10 border-rose-400/40 text-rose-950 dark:text-rose-50',
  },
  {
    id: 'midnight',
    name: 'Midnight Arcade',
    className:
      'bg-gradient-to-b from-slate-900/90 via-violet-950/80 to-slate-950 border-violet-500/30 text-violet-50 dark:text-violet-100',
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

const PRESET_CLASS_BY_ID = Object.fromEntries(PRESET_BULLETIN_THEMES.map((t) => [t.id, t.className])) as Record<
  string,
  string
>;

/** Outer card classes for the bulletin board shell (Board page and admin preview). */
export function getBulletinBoardCardClassName(themeId: string | undefined): string {
  const id = themeId || 'default';
  const preset = PRESET_CLASS_BY_ID[id];
  if (preset && id !== 'default') {
    return cn('overflow-hidden border shadow-xl relative transition-all duration-300', preset);
  }
  return cn('overflow-hidden border shadow-xl relative transition-all duration-300 bg-card border-border');
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
