import {
  Activity,
  Award,
  Bell,
  BookOpen,
  Clock,
  Dices,
  FileText,
  Gift,
  GraduationCap,
  History,
  Home,
  LayoutGrid,
  Megaphone,
  Monitor,
  Palette,
  Plug,
  Tag,
  Target,
  Ticket,
  Trophy,
  User,
  Users,
  Sparkles,
} from 'lucide-react';
import type { Settings } from '@/components/providers/SettingsProvider';
import { isClassroomPillarOn, isRewardsPillarOn } from '@/lib/productPillars';
import { CLASSROOM_SEATING_SECTION_LABEL } from '@/lib/classroom/classroomTabSections';
import type { StaffPortalRole, StaffPortalTabDef } from './types';

function teacherAddonHidden(settings: Settings, tabValue: string): boolean {
  return (settings.teacherHiddenAddOnTabs || []).includes(tabValue);
}

function adminAddonHidden(settings: Settings, tabValue: string): boolean {
  return (settings.adminHiddenAddOnTabs || []).includes(tabValue);
}

/**
 * Staff portal tab model (one registry; two portals):
 *
 * - **Core** tabs always belong in the main nav row when enabled for that role.
 * - **Add-on** tabs: optional in the nav row when pinned via **Add more**.
 * - **Admin** pins school-management tabs (Insights, Houses, …) and toggles school config flags.
 * - **Teachers** pin their own tabs (Raffle, Goals, Attendance, …); admins do not gate teacher nav.
 *   Pinning raffle turns on `enableWeeklyRaffle` (kiosk ticket display still requires Rewards pillar).
 *   With Rewards off, staff raffle uses `classroomPoints`; kiosk tickets still require Rewards.
 *
 * | Tab value        | Admin | Teacher | Notes |
 * |------------------|:-----:|:-------:|-------|
 * | raffle, goals, homework | add-on | add-on | Teacher-operational (not Rewards-gated) |
 * | generated-coupons | — | add-on | Rewards economy (coupon print) |
 * | attendance | add-on | add-on | `payAttendance` pillar |
 * | insights, houses, … | add-on | — | Admin-only |
 */

/** All staff portal tabs (admin + teacher + shared add-ons). */
export const STAFF_PORTAL_TAB_REGISTRY: StaffPortalTabDef[] = [
  {
    value: 'welcome',
    label: 'Welcome',
    icon: Sparkles,
    kind: 'core',
    roles: ['admin', 'teacher'],
    title: 'Home',
    description: 'Your starting point — quick links to every section.',
    isEnabled: () => true,
  },
  // —— Admin core ——
  {
    value: 'students',
    label: 'Students',
    icon: Users,
    kind: 'core',
    roles: ['admin'],
    isEnabled: () => true,
  },
  {
    value: 'classes',
    label: 'Classes',
    icon: BookOpen,
    kind: 'core',
    roles: ['admin', 'teacher'],
    isEnabled: () => true,
  },
  {
    value: 'teachers',
    label: 'Teachers & staff',
    icon: User,
    kind: 'core',
    roles: ['admin'],
    isEnabled: () => true,
  },
  {
    value: 'prizes',
    label: 'Prizes',
    icon: Gift,
    kind: 'core',
    roles: ['admin', 'teacher'],
    isEnabled: (s) => isRewardsPillarOn(s),
  },
  {
    value: 'categories',
    label: 'Points',
    icon: Tag,
    kind: 'core',
    roles: ['admin'],
    title: 'Point categories (school setup)',
    isEnabled: (s) => isRewardsPillarOn(s),
  },
  {
    value: 'classroom',
    label: 'Classroom',
    icon: LayoutGrid,
    kind: 'core',
    roles: ['admin', 'teacher'],
    teacherOperated: true,
    title: `${CLASSROOM_SEATING_SECTION_LABEL}, quick awards, and room display`,
    isEnabled: (s, role) => isClassroomPillarOn(s) || role === 'admin',
  },
  {
    value: 'reports',
    label: 'Reports',
    icon: FileText,
    kind: 'core',
    roles: ['admin', 'teacher'],
    isEnabled: () => true,
  },

  // —— Teacher core (daily tools) ——
  {
    value: 'roster',
    label: 'Students',
    icon: Users,
    kind: 'core',
    roles: ['teacher'],
    isEnabled: () => true,
  },
  {
    value: 'coupons',
    label: 'Points',
    icon: Ticket,
    kind: 'core',
    roles: ['teacher', 'secretary'],
    title: 'Print coupons and award points',
    isEnabled: (s) => isRewardsPillarOn(s),
  },
  {
    value: 'redemptions',
    label: 'Redemptions',
    icon: History,
    kind: 'core',
    roles: ['teacher'],
    isEnabled: (s) => isRewardsPillarOn(s),
  },
  // —— Admin add-ons (feature tabs) ——
  {
    value: 'insights',
    label: 'Insights',
    icon: Activity,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => !!s.enableAdminAnalytics || (s.payRewards ?? true),
  },
  {
    value: 'attendance',
    label: 'Attendance',
    icon: Clock,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    teacherOperated: true,
    isEnabled: (s, role) => {
      if (role === 'teacher') {
        if (teacherAddonHidden(s, 'attendance')) return false;
        return s.payAttendance ?? true;
      }
      return (s.payAttendance ?? true) && (!!s.enableAttendance || !!s.enableClassSignIn);
    },
  },
  {
    value: 'halloffame',
    label: 'Hall of Fame',
    icon: Trophy,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => !!s.enableClassLeaderboard,
  },
  {
    value: 'bulletinboard',
    label: 'Bulletin',
    icon: Megaphone,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => s.bulletinEnabled !== false,
  },
  {
    value: 'smart-screen',
    label: 'Smart Screen',
    icon: Monitor,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => !!s.smartScreenEnabled && !adminAddonHidden(s, 'smart-screen'),
  },
  {
    value: 'library',
    label: 'Library',
    icon: BookOpen,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => s.payLibrary ?? true,
  },
  {
    value: 'bonuspoints',
    label: 'Bonus Points',
    icon: Trophy,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => !!s.enableAchievements,
  },
  {
    value: 'category-badges',
    label: 'Badges',
    icon: Award,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => !!s.enableBadges,
  },
  {
    value: 'goals',
    label: 'Goals',
    icon: Target,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    teacherOperated: true,
    isEnabled: (s, role) => {
      if (role === 'teacher') {
        if (teacherAddonHidden(s, 'goals')) return false;
        return true;
      }
      return !!s.enableGoals;
    },
  },
  {
    value: 'raffle',
    label: 'Raffle',
    icon: Dices,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    teacherOperated: true,
    isEnabled: (s, role) => {
      if (role === 'teacher') {
        if (teacherAddonHidden(s, 'raffle')) return false;
        return true;
      }
      if (adminAddonHidden(s, 'raffle')) return false;
      return !!s.enableWeeklyRaffle;
    },
  },
  {
    value: 'houses',
    label: 'Houses',
    icon: Home,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => !!s.enableHouses,
  },
  {
    value: 'notifications',
    label: 'Notifications',
    icon: Bell,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => !!s.enableNotifications,
  },
  {
    value: 'branding',
    label: 'Branding',
    icon: Palette,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => !adminAddonHidden(s, 'branding'),
  },
  {
    value: 'integrations',
    label: 'Integrations',
    icon: Plug,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => !adminAddonHidden(s, 'integrations'),
  },
  {
    value: 'student-portal',
    label: 'Student home portal',
    icon: GraduationCap,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (s) => !adminAddonHidden(s, 'student-portal'),
  },
  {
    value: 'homework',
    label: 'Homework',
    icon: BookOpen,
    kind: 'addon',
    roles: ['teacher'],
    isEnabled: (s, role) => {
      if (role !== 'teacher') return false;
      if (teacherAddonHidden(s, 'homework')) return false;
      return s.payHomework ?? true;
    },
  },
  {
    value: 'generated-coupons',
    label: 'My coupons',
    icon: Ticket,
    kind: 'addon',
    roles: ['teacher'],
    isEnabled: (s, role) => {
      if (role !== 'teacher') return false;
      if (teacherAddonHidden(s, 'generated-coupons')) return false;
      return isRewardsPillarOn(s);
    },
  },
];

/** When a teacher pins a tab, enable student/school flags needed for that feature. */
export function staffPortalTeacherPinSideEffects(
  tabValue: string,
  pinned: boolean,
): Partial<Settings> {
  if (!pinned) return {};
  switch (tabValue) {
    case 'raffle':
      return { enableWeeklyRaffle: true };
    case 'goals':
      return { enableGoals: true };
    case 'attendance':
      return { payAttendance: true, enableAttendance: true, enableClassSignIn: true };
    case 'homework':
      return { payHomework: true, enableHomework: true };
    case 'generated-coupons':
      return { enableTeacherGeneratedCouponsTab: true };
    default:
      return {};
  }
}

/** Whether an admin add-on tab is enabled — keep admin/page.tsx `isOn` in sync via this helper. */
export function staffPortalAdminAddOnIsOn(settings: Settings, tabValue: string): boolean {
  const def = STAFF_PORTAL_TAB_REGISTRY.find(
    (t) => t.value === tabValue && t.kind === 'addon' && t.roles.includes('admin'),
  );
  return def ? def.isEnabled(settings, 'admin') : false;
}

export function staffPortalTabsForRole(
  role: StaffPortalRole,
  settings: Settings,
): StaffPortalTabDef[] {
  return STAFF_PORTAL_TAB_REGISTRY.filter((tab) => {
    if (!tab.roles.includes(role)) return false;
    return tab.isEnabled(settings, role);
  });
}

export function staffPortalCoreTabs(role: StaffPortalRole, settings: Settings): StaffPortalTabDef[] {
  return staffPortalTabsForRole(role, settings).filter((t) => t.kind === 'core');
}

export function staffPortalAddOnTabs(role: StaffPortalRole, settings: Settings): StaffPortalTabDef[] {
  return staffPortalTabsForRole(role, settings).filter((t) => t.kind === 'addon');
}

/** Default tab when current selection is invalid. */
export function staffPortalDefaultTab(
  role: StaffPortalRole,
  _settings?: Pick<Settings, 'payRewards' | 'payClassroom'>,
): string {
  if (role === 'secretary') return 'coupons';
  if (role === 'teacher' || role === 'admin') return 'welcome';
  return 'welcome';
}

const STAFF_PORTAL_TAB_DESCRIPTIONS: Record<string, string> = {
  students: 'Roster, kiosk access, ID cards, CSV import, and per-student options.',
  classes: 'Class groups, primary teachers, and how students are organized.',
  teachers: 'Staff accounts, roles, passcodes, and who can sign in to the portal.',
  prizes: 'Prize shop inventory, costs, and redemption rules.',
  categories: 'Point categories teachers use when awarding or printing coupons.',
  classroom: `${CLASSROOM_SEATING_SECTION_LABEL}, quick awards, and classroom display tools.`,
  reports: 'Exports and summaries of points, redemptions, and activity.',
  roster: 'Your students — search, filter, and open profiles for awards.',
  coupons: 'Print coupon sheets and award or deduct points.',
  redemptions: 'History of prize redemptions for your students.',
  insights: 'School-wide analytics and usage trends.',
  attendance: 'Sign-in, periods, and attendance reporting.',
  halloffame: 'Leaderboards for the hallway or assembly display.',
  bulletinboard: 'School announcements on kiosk and portal screens.',
  'smart-screen': 'Live display layouts for TVs and projectors.',
  library: 'Checkout, returns, and library point rules.',
  bonuspoints: 'Achievement bonuses and milestone rewards.',
  'category-badges': 'Badges students earn from point categories.',
  goals: 'Class and student goals with progress tracking.',
  houses: 'House points, sorting, and competitions.',
  notifications: 'Email and SMS templates for families and staff.',
  branding: 'Logos, colors, kiosk profiles, and school identity.',
  integrations: 'External tools and API connections.',
  'student-portal': 'What students see on the home portal and kiosk.',
  homework: 'Homework tracking and classroom assignments.',
  raffle: 'Weekly raffle tickets and drawings.',
  'generated-coupons': 'Coupons you generated for your classes.',
};

/** Keep Welcome as the first nav item when present. */
export function staffPortalPinWelcomeFirst<T extends { value: string }>(tabs: T[]): T[] {
  const welcome = tabs.find((t) => t.value === 'welcome');
  if (!welcome) return tabs;
  return [welcome, ...tabs.filter((t) => t.value !== 'welcome')];
}

/** Description for Welcome tab cards — uses registry `description`, then map, then `title`. */
export function staffPortalIsTeacherOperatedTab(tabValue: string): boolean {
  const def = STAFF_PORTAL_TAB_REGISTRY.find((t) => t.value === tabValue);
  return def?.teacherOperated === true;
}

/** Banner copy when school admin opens a teacher-operated tab. */
export function staffPortalTeacherOperatedAdminNote(tabValue: string): string | null {
  if (!staffPortalIsTeacherOperatedTab(tabValue)) return null;
  const def = STAFF_PORTAL_TAB_REGISTRY.find((t) => t.value === tabValue);
  const label = def?.label ?? 'This section';
  return `${label} is mainly for teachers in day-to-day classroom use. You can preview and set defaults here as school admin.`;
}

export function staffPortalTabDescription(tab: StaffPortalTabDef): string {
  if (tab.description) return tab.description;
  const mapped = STAFF_PORTAL_TAB_DESCRIPTIONS[tab.value];
  if (mapped) return mapped;
  if (tab.title) return tab.title;
  if (tab.kind === 'addon') {
    return 'Optional feature — pin it from Add more or open it here when enabled.';
  }
  return `Open ${tab.label} for tasks in this area.`;
}
