/**
 * Printable flyers and other promotional assets (static HTML under `public/marketing/`).
 */

export type FlyerAudience =
  | 'general'
  | 'staff'
  | 'elementary'
  | 'middle'
  | 'high'
  | 'principal'
  | 'parents'
  | 'features';

export type PromotionFlyer = {
  id: string;
  name: string;
  description: string;
  href: string;
  audience: FlyerAudience;
  preview: {
    border: string;
    tag: string;
  };
  tags: readonly string[];
};

export const FLYER_AUDIENCE_LABELS: Record<FlyerAudience, string> = {
  general: 'All styles',
  staff: 'For teachers & staff',
  elementary: 'Elementary (K–5)',
  middle: 'Middle school (6–8)',
  high: 'High school (9–12)',
  principal: 'For principals',
  parents: 'For parents & families',
  features: 'Feature highlights',
};

export const FLYER_AUDIENCE_ORDER: readonly FlyerAudience[] = [
  'features',
  'staff',
  'elementary',
  'middle',
  'high',
  'parents',
  'principal',
  'general',
];

export const PROMOTION_FLYERS: readonly PromotionFlyer[] = [
  {
    id: 'arcade',
    name: 'Arcade Neon',
    description:
      'Dark cosmic layout with fuchsia and cyan glows—matches the LevelUp Arcade landing page.',
    href: '/marketing/flyer-arcade.html',
    audience: 'general',
    preview: { border: 'border-fuchsia-500/30', tag: 'Arcade' },
    tags: ['PBIS', 'Gaming', 'Events'],
  },
  {
    id: 'scholastic',
    name: 'Scholastic Indigo',
    description:
      'Light, readable layout with indigo accents—ideal for bulletin boards and parent nights.',
    href: '/marketing/flyer-scholastic.html',
    audience: 'general',
    preview: { border: 'border-indigo-300/50', tag: 'Classic' },
    tags: ['Print-friendly', 'Parents', 'PBIS'],
  },
  {
    id: 'professional',
    name: 'Professional Brief',
    description:
      'Clean white one-pager with structured sections—great for admin packets and procurement.',
    href: '/marketing/flyer-professional.html',
    audience: 'general',
    preview: { border: 'border-slate-400/40', tag: 'Admin' },
    tags: ['DOE', 'Procurement', 'Overview'],
  },
  {
    id: 'bold',
    name: 'Bold Navy',
    description:
      'High-contrast navy and white with oversized type—stands out on doors and hallway displays.',
    href: '/marketing/flyer-bold.html',
    audience: 'general',
    preview: { border: 'border-sky-500/30', tag: 'Bold' },
    tags: ['Hallway', 'Poster', 'High contrast'],
  },
  {
    id: 'sunset',
    name: 'Sunset Warm',
    description:
      'Warm coral and amber tones with a welcoming feel—great for open houses and community nights.',
    href: '/marketing/flyer-sunset.html',
    audience: 'general',
    preview: { border: 'border-orange-400/40', tag: 'Warm' },
    tags: ['Open house', 'Community', 'Friendly'],
  },
  {
    id: 'retro',
    name: 'Retro Pixel',
    description:
      '80s arcade grid and neon borders—eye-catching for student-facing hallways and fairs.',
    href: '/marketing/flyer-retro.html',
    audience: 'general',
    preview: { border: 'border-lime-400/40', tag: 'Retro' },
    tags: ['Students', 'Fair', 'Fun'],
  },
  {
    id: 'minimal',
    name: 'Minimal Mono',
    description:
      'Black-and-white editorial layout with generous whitespace—low ink, maximum clarity.',
    href: '/marketing/flyer-minimal.html',
    audience: 'general',
    preview: { border: 'border-white/25', tag: 'Minimal' },
    tags: ['Low ink', 'Simple', 'Staff room'],
  },
  {
    id: 'teachers-quickstart',
    name: 'Teacher Quickstart',
    description:
      'Staff-room handout for daily use: award points, run raffle moments, and keep classroom momentum moving.',
    href: '/marketing/flyer-teachers-quickstart.html',
    audience: 'staff',
    preview: { border: 'border-teal-400/40', tag: 'Staff' },
    tags: ['Teachers', 'Quickstart', 'PBIS'],
  },
  {
    id: 'staff-pbis-playbook',
    name: 'PBIS Staff Playbook',
    description:
      'Practical coaching flyer for consistent expectations, recognition language, and redemption routines.',
    href: '/marketing/flyer-staff-pbis-playbook.html',
    audience: 'staff',
    preview: { border: 'border-lime-400/40', tag: 'Playbook' },
    tags: ['Staff', 'PBIS', 'Consistency'],
  },
  {
    id: 'students-elementary',
    name: 'Elementary Stars',
    description:
      'Bright, playful K–5 flyer—simple language about earning stars and picking prizes.',
    href: '/marketing/flyer-students-elementary.html',
    audience: 'elementary',
    preview: { border: 'border-amber-400/40', tag: 'K–5' },
    tags: ['Students', 'K–5', 'Playful'],
  },
  {
    id: 'students-middle',
    name: 'Middle School Rank',
    description:
      'Purple/teal vibe for grades 6–8—leaderboards, streaks, and rewards that feel age-appropriate.',
    href: '/marketing/flyer-students-middle.html',
    audience: 'middle',
    preview: { border: 'border-violet-500/40', tag: '6–8' },
    tags: ['Students', '6–8', 'Leaderboard'],
  },
  {
    id: 'students-high',
    name: 'High School Progress',
    description:
      'Mature, minimal design for grades 9–12—autonomy, real privileges, no childish gimmicks.',
    href: '/marketing/flyer-students-high.html',
    audience: 'high',
    preview: { border: 'border-yellow-500/35', tag: '9–12' },
    tags: ['Students', '9–12', 'Autonomy'],
  },
  {
    id: 'principal-data',
    name: 'Principal: PBIS Data',
    description:
      'Evidence-focused one-pager—real-time telemetry, consistency, and redemption insights.',
    href: '/marketing/flyer-principal-data.html',
    audience: 'principal',
    preview: { border: 'border-sky-500/40', tag: 'Data' },
    tags: ['Principals', 'PBIS', 'Analytics'],
  },
  {
    id: 'principal-rollout',
    name: 'Principal: Rollout Plan',
    description:
      'Step-by-step implementation guide—roster import, pilot team, kiosks, and scale-up.',
    href: '/marketing/flyer-principal-rollout.html',
    audience: 'principal',
    preview: { border: 'border-emerald-500/40', tag: 'Launch' },
    tags: ['Principals', 'Onboarding', 'Timeline'],
  },
  {
    id: 'principal-roi',
    name: 'Principal: Value & Budget',
    description:
      'Procurement-friendly comparison—one platform vs. patchwork tools, with vendor contact.',
    href: '/marketing/flyer-principal-roi.html',
    audience: 'principal',
    preview: { border: 'border-amber-600/40', tag: 'ROI' },
    tags: ['Principals', 'Budget', 'DOE'],
  },
  {
    id: 'students-elementary-2',
    name: 'Quest Board',
    description:
      'Star-field adventure theme for K–5—quest cards with point values make earning feel like a game.',
    href: '/marketing/flyer-students-elementary-2.html',
    audience: 'elementary',
    preview: { border: 'border-indigo-400/40', tag: 'K–5' },
    tags: ['Students', 'K–5', 'Adventure'],
  },
  {
    id: 'students-middle-2',
    name: 'Achievements Unlocked',
    description:
      'Dark achievement-card layout for grades 6–8—unlockable badges, streaks, and dual-image grid.',
    href: '/marketing/flyer-students-middle-2.html',
    audience: 'middle',
    preview: { border: 'border-blue-500/40', tag: '6–8' },
    tags: ['Students', '6–8', 'Achievements'],
  },
  {
    id: 'students-high-2',
    name: 'Do Good, Get Rewarded',
    description:
      'Black/green editorial for grades 9–12—prize price list, student quote, no-nonsense tone.',
    href: '/marketing/flyer-students-high-2.html',
    audience: 'high',
    preview: { border: 'border-green-500/35', tag: '9–12' },
    tags: ['Students', '9–12', 'Rewards list'],
  },
  {
    id: 'principal-culture',
    name: 'Principal: School Culture',
    description:
      'Crimson and white one-pager built around culture pillars—consistency, recognition, accountability.',
    href: '/marketing/flyer-principal-culture.html',
    audience: 'principal',
    preview: { border: 'border-rose-600/40', tag: 'Culture' },
    tags: ['Principals', 'Culture', 'PBIS'],
  },
  {
    id: 'parents',
    name: 'Parent & Family Guide',
    description:
      'Light, welcoming flyer that explains how points work and answers common family questions.',
    href: '/marketing/flyer-parents.html',
    audience: 'parents',
    preview: { border: 'border-cyan-400/40', tag: 'Families' },
    tags: ['Parents', 'Families', 'Overview'],
  },
  {
    id: 'families-home-portal',
    name: 'Family Home Portal',
    description:
      'Parent-facing home access flyer covering student balances, raffle tickets, rewards, and school updates.',
    href: '/marketing/flyer-families-home-portal.html',
    audience: 'parents',
    preview: { border: 'border-blue-400/40', tag: 'Home' },
    tags: ['Families', 'Portal', 'At home'],
  },
  {
    id: 'principal-tech',
    name: 'Principal: Tech & Safety',
    description:
      'Infrastructure, encryption, FERPA/COPPA/NY Ed Law 2-d, AI safeguards, audit logs, and DPSA documentation.',
    href: '/marketing/flyer-principal-tech.html',
    audience: 'principal',
    preview: { border: 'border-slate-500/50', tag: 'Safety' },
    tags: ['Principals', 'Security', 'Compliance'],
  },
  {
    id: 'feature-houses',
    name: 'School Houses',
    description:
      'Spirit houses, sorting ceremony, house parents, point rollups, and Hall of Fame integration.',
    href: '/marketing/flyer-feature-houses.html',
    audience: 'features',
    preview: { border: 'border-violet-500/40', tag: 'Houses' },
    tags: ['Houses', 'Spirit', 'PBIS'],
  },
  {
    id: 'feature-raffle',
    name: 'Weekly Raffle',
    description:
      'Points-to-tickets, jackpot reels, spin wheel, or loto cage—with equal-odds and deduction rules.',
    href: '/marketing/flyer-feature-raffle.html',
    audience: 'features',
    preview: { border: 'border-amber-500/40', tag: 'Raffle' },
    tags: ['Raffle', 'Assembly', 'Fun'],
  },
  {
    id: 'feature-library',
    name: 'School Library',
    description:
      'Checkout, due dates, late fees, and on-time bonuses tied to your points economy.',
    href: '/marketing/flyer-feature-library.html',
    audience: 'features',
    preview: { border: 'border-emerald-500/40', tag: 'Library' },
    tags: ['Library', 'Books', 'Points'],
  },
  {
    id: 'feature-student-portal',
    name: 'Student Home Portal',
    description:
      'Passcode-protected home access—balance, house, raffle tickets, and optional parent digest.',
    href: '/marketing/flyer-feature-student-portal.html',
    audience: 'features',
    preview: { border: 'border-sky-500/40', tag: 'Portal' },
    tags: ['Student portal', 'Home', 'Access'],
  },
  {
    id: 'feature-bulletin',
    name: 'Bulletin Board',
    description:
      'Hallway display for incentives, news, and WOW posts—custom themes and live admin posts.',
    href: '/marketing/flyer-feature-bulletin.html',
    audience: 'features',
    preview: { border: 'border-yellow-500/40', tag: 'Display' },
    tags: ['Bulletin', 'TV display', 'Incentives'],
  },
  {
    id: 'feature-engagement',
    name: 'Achievements & Engagement',
    description:
      'Optional achievements, badges, levels, streaks, goals, and challenges—toggle what you need.',
    href: '/marketing/flyer-feature-engagement.html',
    audience: 'features',
    preview: { border: 'border-fuchsia-500/40', tag: 'XP' },
    tags: ['Achievements', 'Badges', 'Streaks'],
  },
  {
    id: 'feature-hall-of-fame',
    name: 'Hall of Fame',
    description:
      'Live leaderboards for students, classes, houses, and goals—fullscreen-ready for hallway TVs.',
    href: '/marketing/flyer-feature-hall-of-fame.html',
    audience: 'features',
    preview: { border: 'border-amber-500/40', tag: 'HoF' },
    tags: ['Hall of Fame', 'Leaderboard', 'Display'],
  },
  {
    id: 'feature-attendance',
    name: 'Attendance & Periods',
    description:
      'Configure periods, teacher assignments, reward rules, and class sign-in from one admin tab.',
    href: '/marketing/flyer-feature-attendance.html',
    audience: 'features',
    preview: { border: 'border-emerald-600/40', tag: 'Attend' },
    tags: ['Attendance', 'Periods', 'PBIS'],
  },
  {
    id: 'feature-notifications',
    name: 'Staff Notifications',
    description:
      'Alerts for rewards, attendance, library, milestones, inventory, and optional parent digests.',
    href: '/marketing/flyer-feature-notifications.html',
    audience: 'features',
    preview: { border: 'border-violet-500/40', tag: 'Alerts' },
    tags: ['Notifications', 'Staff', 'Alerts'],
  },
  {
    id: 'feature-id-cards-themes',
    name: 'ID Cards & Student Themes',
    description:
      'Print branded student ID cards and design school or per-student themes for kiosk, shop, and printouts.',
    href: '/marketing/flyer-feature-id-cards-themes.html',
    audience: 'features',
    preview: { border: 'border-sky-500/40', tag: 'IDs' },
    tags: ['ID cards', 'Themes', 'Branding', 'Print'],
  },
  {
    id: 'feature-student-kiosk',
    name: 'Student Kiosk (Scan Card)',
    description:
      'Touchscreen sign-in—students scan their ID card, type a badge, or use QR/face to open rewards and the prize shop.',
    href: '/marketing/flyer-feature-student-kiosk.html',
    audience: 'features',
    preview: { border: 'border-teal-500/40', tag: 'Kiosk' },
    tags: ['Kiosk', 'Students', 'Scan card', 'Rewards'],
  },
  {
    id: 'feature-rewards-shop',
    name: 'Rewards Shop',
    description:
      'Feature flyer for prize menus, inventory, point prices, checkout flow, and student-facing shop displays.',
    href: '/marketing/flyer-feature-rewards-shop.html',
    audience: 'features',
    preview: { border: 'border-pink-500/40', tag: 'Shop' },
    tags: ['Rewards', 'Inventory', 'Shop'],
  },
] as const;

export function getPromotionFlyersByAudience(
  audience: FlyerAudience,
): readonly PromotionFlyer[] {
  return PROMOTION_FLYERS.filter((f) => f.audience === audience);
}
