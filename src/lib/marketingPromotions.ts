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
  general: 'General layouts',
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
    name: 'Arcade Pitch',
    description:
      'Arcade energy pitch for PBIS, events, and school-wide engagement.',
    href: '/marketing/flyer-arcade.html',
    audience: 'general',
    preview: { border: 'border-fuchsia-500/30', tag: 'Arcade' },
    tags: ['PBIS', 'Gaming', 'Events'],
  },
  {
    id: 'scholastic',
    name: 'Scholastic Overview',
    description:
      'Parent-friendly overview of points, prizes, and school-wide progress.',
    href: '/marketing/flyer-scholastic.html',
    audience: 'general',
    preview: { border: 'border-indigo-300/50', tag: 'Classic' },
    tags: ['Print-friendly', 'Parents', 'PBIS'],
  },
  {
    id: 'professional',
    name: 'Professional Brief',
    description:
      'Admin and procurement overview with platform capabilities.',
    href: '/marketing/flyer-professional.html',
    audience: 'general',
    preview: { border: 'border-slate-400/40', tag: 'Admin' },
    tags: ['DOE', 'Procurement', 'Overview'],
  },
  {
    id: 'bold',
    name: 'Bold Navy (Reference)',
    description:
      'Canonical Bold Navy flyer—navy background, sky accents, oversized headline, feature blocks.',
    href: '/marketing/flyer-bold.html',
    audience: 'general',
    preview: { border: 'border-sky-500/30', tag: 'Bold' },
    tags: ['Hallway', 'Poster', 'High contrast'],
  },
  {
    id: 'levelup-rewards-premium',
    name: 'PBIS Overview (Premium)',
    description:
      'High-fidelity two-page general guide—student portal overview, automated school-wide routines, and Sole Source procurement specs.',
    href: '/marketing/levelup-rewards-flyer.html',
    audience: 'general',
    preview: { border: 'border-fuchsia-500/40', tag: 'Premium' },
    tags: ['Overview', 'PBIS', 'Sole Source', 'Rewards'],
  },
  {
    id: 'sunset',
    name: 'Community Night',
    description:
      'Open house and community night pitch with Hall of Fame highlight.',
    href: '/marketing/flyer-sunset.html',
    audience: 'general',
    preview: { border: 'border-orange-400/40', tag: 'Warm' },
    tags: ['Open house', 'Community', 'Friendly'],
  },
  {
    id: 'retro',
    name: 'Hallway Poster',
    description:
      'Bold Navy layout—student-facing scan-and-earn poster for hallways and fairs.',
    href: '/marketing/flyer-retro.html',
    audience: 'general',
    preview: { border: 'border-lime-400/40', tag: 'Retro' },
    tags: ['Students', 'Fair', 'Fun'],
  },
  {
    id: 'minimal',
    name: 'Quick Overview',
    description:
      'Short one-page overview of award, scan, track, and scale.',
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
    id: 'yeshiva-rebbeim-moros',
    name: 'Yeshiva: Rebbeim & Moros Quickstart',
    description:
      'Yeshiva staff handout—derech eretz, middos tovos, fast recognition routine, and a live teacher-tool preview.',
    href: '/marketing/flyer-yeshiva-rebbeim-moros.html',
    audience: 'staff',
    preview: { border: 'border-sky-300/40', tag: 'Yeshiva' },
    tags: ['Yeshiva', 'Staff', 'Middos'],
  },
  {
    id: 'levelup-teachers',
    name: 'Teacher Companion (Premium)',
    description:
      'High-fidelity classroom playbook—1-tap positive reinforcement, physical kiosk scans, digital raffle wheels, and classroom incentive ideas.',
    href: '/marketing/levelup-teachers-flyer.html',
    audience: 'staff',
    preview: { border: 'border-violet-500/40', tag: 'Premium' },
    tags: ['Teachers', 'Classroom', 'Playbook', 'Raffles'],
  },
  {
    id: 'levelup-rewards-basic-settings',
    name: 'Rewards Basic Settings',
    description:
      'Admin handout—point categories, rewards shop setup, coupon printing, and school rules. Shows the student kiosk sign-in screen (not the school login page).',
    href: '/marketing/levelup-rewards-basic-settings-flyer.html',
    audience: 'staff',
    preview: { border: 'border-blue-500/40', tag: 'Admin' },
    tags: ['Admin', 'Setup', 'Categories', 'Kiosk'],
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
    id: 'students-kiosk-hype',
    name: 'Student Kiosk Hype',
    description:
      'Hallway & kiosk backdrop—Scan. Earn. Level Up! Morning scan steps, point stacking, and redemption prizes.',
    href: '/marketing/flyer-students-kiosk-hype.html',
    audience: 'general',
    preview: { border: 'border-fuchsia-500/50', tag: 'Hype' },
    tags: ['Students', 'Kiosk', 'Hallway'],
  },
  {
    id: 'yeshiva-talmidim',
    name: 'Yeshiva: Talmidim Scan & Earn',
    description:
      'Student-facing yeshiva flyer—morning scan, derech eretz, middos tovos, and redeemable rewards (no apps).',
    href: '/marketing/flyer-yeshiva-talmidim.html',
    audience: 'general',
    preview: { border: 'border-amber-300/40', tag: 'Talmidim' },
    tags: ['Yeshiva', 'Students', 'Kiosk'],
  },
  {
    id: 'levelup-principals',
    name: 'Leadership Brief (Premium)',
    description:
      'High-fidelity administrator guide—building-wide PBIS consistency, staff telemetry, NYS Ed Law 2-d compliance, and federal Title I/IV-A procurement specs.',
    href: '/marketing/levelup-principals-flyer.html',
    audience: 'principal',
    preview: { border: 'border-cyan-500/40', tag: 'Premium' },
    tags: ['Principals', 'Procurement', 'NYS 2-d', 'Telemetry'],
  },
  {
    id: 'levelup-funding-premium',
    name: 'Funding Guide (Premium)',
    description:
      'High-fidelity procurement playbook—Title I & Title IV federal grants, NYS NPSE safety claims, MSR attendance tracking, and direct FAMIS Open-Market purchase orders.',
    href: '/marketing/levelup-funding-flyer.html',
    audience: 'principal',
    preview: { border: 'border-emerald-500/45', tag: 'Premium' },
    tags: ['Funding', 'Procurement', 'FAMIS', 'NYS NPSE'],
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
    id: 'parents-privacy-security',
    name: 'Parent: Privacy & Safety',
    description:
      'Newsletter-ready sheet—NYS § 2-d, no third-party ads, kiosk-only IDs, and positive-development focus.',
    href: '/marketing/flyer-parents-privacy-security.html',
    audience: 'parents',
    preview: { border: 'border-teal-600/50', tag: 'Privacy' },
    tags: ['Parents', 'Security', 'Newsletter'],
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
    id: 'funding-overview',
    name: 'Funding: Procurement Overview',
    description:
      'Universal how-to-buy sheet—NYC DOE vendor code, Title I/SIG, NYS nonpublic paths, and § 2-d compliance.',
    href: '/marketing/flyer-funding-overview.html',
    audience: 'principal',
    preview: { border: 'border-sky-600/50', tag: 'Funding' },
    tags: ['Procurement', 'DOE', 'Budget'],
  },
  {
    id: 'funding-nyc-doe',
    name: 'Funding: NYC DOE',
    description:
      'NYC public school procurement—vendor VS00109014, Title I, SIG, tax levy PO steps, and FAMIS guidance.',
    href: '/marketing/flyer-funding-nyc-doe.html',
    audience: 'principal',
    preview: { border: 'border-blue-800/50', tag: 'NYC' },
    tags: ['DOE', 'FAMIS', 'Title I'],
  },
  {
    id: 'funding-nys-nonpublic',
    name: 'Funding: NYS Nonpublic',
    description:
      'Yeshivas & day schools—Title IV Equitable Services, MSR attendance reimbursement, and NPSE safety grant.',
    href: '/marketing/flyer-funding-nys-nonpublic.html',
    audience: 'principal',
    preview: { border: 'border-amber-700/50', tag: 'Private' },
    tags: ['Nonpublic', 'MSR', 'NPSE'],
  },
  {
    id: 'yeshiva-leadership',
    name: 'Yeshiva: Leadership Brief',
    description:
      'Leadership one-pager—derech eretz + attendance + middos tovos outcomes with nonpublic procurement alignment.',
    href: '/marketing/flyer-yeshiva-leadership.html',
    audience: 'principal',
    preview: { border: 'border-slate-400/40', tag: 'Yeshiva' },
    tags: ['Yeshiva', 'Leadership', 'Nonpublic'],
  },
  {
    id: 'funding-quick-reference',
    name: 'Funding: Quick Reference',
    description:
      'Low-ink checklist and budget-bucket table for business managers—public and nonpublic streams on one page.',
    href: '/marketing/flyer-funding-quick-reference.html',
    audience: 'principal',
    preview: { border: 'border-zinc-500/50', tag: 'Ref' },
    tags: ['Procurement', 'Checklist', 'Print'],
  },
  {
    id: 'it-kiosk-setup',
    name: 'IT: Kiosk Setup Guide',
    description:
      'Leave-behind for school IT—hardware specs, Wi-Fi/Ethernet, Firebase pipeline, encryption, plug-and-play deploy.',
    href: '/marketing/flyer-it-kiosk-setup.html',
    audience: 'principal',
    preview: { border: 'border-slate-600/50', tag: 'IT' },
    tags: ['IT', 'Kiosk', 'Deployment'],
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
    name: 'Raffle',
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
  {
    id: 'feature-vending-machine',
    name: 'Rewards Vending Machine',
    description:
      'Two optional hardware samples—full countertop unit and compact desktop smart vending—plus LevelUp logo, School Rewards branding, ID tap-in, and motor dispense.',
    href: '/marketing/flyer-feature-vending-machine.html',
    audience: 'features',
    preview: { border: 'border-amber-600/40', tag: 'Vending' },
    tags: ['Vending', 'Hardware', 'Optional', 'Desktop'],
  },
] as const;

export function getPromotionFlyersByAudience(
  audience: FlyerAudience,
): readonly PromotionFlyer[] {
  return PROMOTION_FLYERS.filter((f) => f.audience === audience);
}
