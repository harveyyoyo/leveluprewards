import {
  Activity,
  Award,
  Bell,
  BookOpen,
  Clock,
  DoorOpen,
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
import { CLASSROOM_SEATING_SECTION_LABEL, CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';
import type { StaffPortalRole, StaffPortalTabDef } from './types';
import { displaysFeatureEnabled } from '@/lib/displays/displayRoutes';

export { normalizeStaffPortalTabValue, normalizeStaffPortalTabValues } from '@/lib/displays/displayRoutes';

function teacherAddonHidden(settings: Settings, tabValue: string): boolean {
  return (settings.teacherHiddenAddOnTabs || []).includes(tabValue);
}

function adminAddonHidden(settings: Settings, tabValue: string): boolean {
  return (settings.adminHiddenAddOnTabs || []).includes(tabValue);
}

/** Add-on tabs teachers may pin; changes affect the whole school (show coordination notice). */
export const STAFF_PORTAL_SCHOOLWIDE_TEACHER_TAB_VALUES = [
  'insights',
  'displays',
  'library',
  'bonuspoints',
  'category-badges',
  'houses',
  'notifications',
  'branding',
  'integrations',
  'student-portal',
] as const;

function teacherAddonEnabled(
  settings: Settings,
  tabValue: string,
  whenEnabled: (s: Settings) => boolean,
): boolean {
  if (teacherAddonHidden(settings, tabValue)) return false;
  return whenEnabled(settings);
}

/**
 * Staff portal tab model (one registry; role-specific nav):
 *
 * - **Core** tabs always belong in the main nav row when enabled for that role.
 * - **Add-on** tabs: optional in the nav row when pinned via **Add more**.
 * - **Admin** and **teacher** are separate sign-ins (`/admin` vs `/teacher`); staff who do both need two accounts.
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
 * | insights, displays, library, … | add-on | add-on (pin) | School-wide; see `STAFF_PORTAL_SCHOOLWIDE_TEACHER_TAB_VALUES` |
 * | notifications, branding, integrations, student-portal | add-on | add-on (pin) | School config — coordinate with admin |
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
    label: 'Rewards',
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
    label: CLASSROOM_TAB_LABEL,
    icon: LayoutGrid,
    kind: 'core',
    roles: ['admin', 'teacher'],
    teacherOperated: true,
    title: `${CLASSROOM_SEATING_SECTION_LABEL}, behavior, alerts, and room display`,
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
    label: 'Analytics',
    icon: Activity,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    isEnabled: (s, role) => {
      const on = !!s.enableAdminAnalytics || (s.payRewards ?? true);
      if (role === 'teacher') return teacherAddonEnabled(s, 'insights', () => on);
      return on;
    },
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
    value: 'displays',
    label: 'Displays',
    icon: Monitor,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    isEnabled: (s, role) => {
      const on = displaysFeatureEnabled(s);
      if (role === 'teacher') return teacherAddonEnabled(s, 'displays', () => on);
      return on && !adminAddonHidden(s, 'displays');
    },
  },
  {
    value: 'library',
    label: 'Library',
    icon: BookOpen,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    isEnabled: (s, role) => {
      const on = s.payLibrary ?? true;
      if (role === 'teacher') return teacherAddonEnabled(s, 'library', () => on);
      return on;
    },
  },
  {
    value: 'bonuspoints',
    label: 'Bonus Points',
    icon: Trophy,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    isEnabled: (s, role) => {
      const on = !!s.enableAchievements;
      if (role === 'teacher') return teacherAddonEnabled(s, 'bonuspoints', () => on);
      return on;
    },
  },
  {
    value: 'category-badges',
    label: 'Badges',
    icon: Award,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    isEnabled: (s, role) => {
      const on = !!s.enableBadges;
      if (role === 'teacher') return teacherAddonEnabled(s, 'category-badges', () => on);
      return on;
    },
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
    roles: ['admin', 'teacher'],
    isEnabled: (s, role) => {
      if (!s.enableHouses) return false;
      if (role === 'teacher' && teacherAddonHidden(s, 'houses')) return false;
      return true;
    },
  },
  {
    value: 'recess',
    label: 'Recess',
    icon: DoorOpen,
    kind: 'core',
    roles: ['admin'],
    title: 'Check students out for a break or bathroom',
    description: 'Sign students out for a quick break or bathroom and time how long they are gone.',
    isEnabled: (s) => s.enableRecess !== false,
  },
  {
    value: 'notifications',
    label: 'Notifications',
    icon: Bell,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    isEnabled: (s, role) => {
      const on = !!s.enableNotifications;
      if (role === 'teacher') return teacherAddonEnabled(s, 'notifications', () => on);
      return on;
    },
  },
  {
    value: 'branding',
    label: 'Branding',
    icon: Palette,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    isEnabled: (s, role) => {
      if (role === 'teacher') return teacherAddonEnabled(s, 'branding', () => true);
      return !adminAddonHidden(s, 'branding');
    },
  },
  {
    value: 'integrations',
    label: 'Integrations',
    icon: Plug,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    isEnabled: (s, role) => {
      if (role === 'teacher') return teacherAddonEnabled(s, 'integrations', () => true);
      return !adminAddonHidden(s, 'integrations');
    },
  },
  {
    value: 'student-portal',
    label: 'Student home portal',
    icon: GraduationCap,
    kind: 'addon',
    roles: ['admin', 'teacher'],
    isEnabled: (s, role) => {
      if (role === 'teacher') return teacherAddonEnabled(s, 'student-portal', () => true);
      return !adminAddonHidden(s, 'student-portal');
    },
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


/**
 * Shared sidebar / Add more order for admin and teacher portals.
 * Role-specific tabs (e.g. admin `students` vs teacher `roster`) share the same slot.
 */
export const STAFF_PORTAL_CANONICAL_TAB_ORDER: readonly string[] = [
  'welcome',
  'students',
  'roster',
  'classes',
  'teachers',
  'prizes',
  'categories',
  'coupons',
  'classroom',
  'reports',
  'redemptions',
  'insights',
  'attendance',
  'displays',
  'library',
  'bonuspoints',
  'category-badges',
  'goals',
  'raffle',
  'houses',
  'recess',
  'notifications',
  'branding',
  'integrations',
  'student-portal',
  'homework',
  'generated-coupons',
];

const STAFF_PORTAL_TAB_ORDER_INDEX = new Map(
  STAFF_PORTAL_CANONICAL_TAB_ORDER.map((value, index) => [value, index]),
);

export function staffPortalTabSortIndex(tabValue: string): number {
  return STAFF_PORTAL_TAB_ORDER_INDEX.get(tabValue) ?? 9999;
}

export function staffPortalSortTabs<T extends { value: string }>(tabs: readonly T[]): T[] {
  return [...tabs].sort(
    (a, b) => staffPortalTabSortIndex(a.value) - staffPortalTabSortIndex(b.value),
  );
}

export function staffPortalSortTabValues(tabValues: readonly string[]): string[] {
  return [...tabValues].sort(
    (a, b) => staffPortalTabSortIndex(a) - staffPortalTabSortIndex(b),
  );
}

export function staffPortalOrderPinnedAddOnValues(
  pinnedValues: readonly string[],
  availableValues: ReadonlySet<string> | readonly string[],
): string[] {
  const available = availableValues instanceof Set ? availableValues : new Set(availableValues);
  return staffPortalSortTabValues(pinnedValues.filter((v) => available.has(v)));
}

export function staffPortalMergePinnedAddOnValues(
  currentPinned: readonly string[],
  tabValue: string,
): string[] {
  return staffPortalSortTabValues([...new Set([...currentPinned, tabValue])]);
}

export function staffPortalAllAddOnTabValues(addOnDefs: readonly { value: string }[]): string[] {
  return staffPortalSortTabs(addOnDefs).map((d) => d.value);
}

export function staffPortalSortPinnedTabDefs<T extends { value: string }>(
  pinnedValues: readonly string[],
  byValue: ReadonlyMap<string, T>,
): T[] {
  return staffPortalSortTabValues(pinnedValues)
    .map((v) => byValue.get(v))
    .filter((t): t is T => t != null);
}

export function staffPortalAppendTabsInCanonicalOrder<T extends { value: string }>(
  ordered: T[],
  available: readonly T[],
): T[] {
  const seen = new Set(ordered.map((t) => t.value));
  const out = [...ordered];
  for (const def of staffPortalSortTabs(available)) {
    if (seen.has(def.value)) continue;
    out.push(def);
    seen.add(def.value);
  }
  return out;
}

export function staffPortalOrderMainTabs<T extends { value: string }>(
  available: readonly T[],
  savedOrder: string[] | undefined,
): T[] {
  const availableByValue = new Map(available.map((t) => [t.value, t]));
  const out: T[] = [];
  const seen = new Set<string>();

  for (const v of savedOrder || []) {
    const def = availableByValue.get(v);
    if (!def || seen.has(def.value)) continue;
    out.push(def);
    seen.add(def.value);
  }

  return staffPortalPinWelcomeFirst(staffPortalAppendTabsInCanonicalOrder(out, available));
}

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
    case 'insights':
      return { enableAdminAnalytics: true };
    case 'displays':
    case 'bulletinboard':
    case 'smart-screen':
    case 'halloffame':
      return { bulletinEnabled: true, smartScreenEnabled: true, enableClassLeaderboard: true };
    case 'library':
      return { payLibrary: true };
    case 'bonuspoints':
      return { enableAchievements: true };
    case 'category-badges':
      return { enableBadges: true };
    case 'houses':
      return { enableHouses: true };
    case 'notifications':
      return { enableNotifications: true };
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

export function staffPortalTabByValue(tabValue: string): StaffPortalTabDef | undefined {
  return STAFF_PORTAL_TAB_REGISTRY.find((t) => t.value === tabValue);
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
  return staffPortalSortTabs(
    staffPortalTabsForRole(role, settings).filter((t) => t.kind === 'core'),
  );
}

export function staffPortalAddOnTabs(role: StaffPortalRole, settings: Settings): StaffPortalTabDef[] {
  return staffPortalSortTabs(
    staffPortalTabsForRole(role, settings).filter((t) => t.kind === 'addon'),
  );
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
  students: 'Manage enrollments, ID cards, kiosk access, and per-student options.',
  classes: 'Create class groups, assign teachers, and organize students.',
  teachers: 'Manage teachers, leaders, desk staff, passcodes, and portal access.',
  prizes: 'Manage reward shop items, costs, stock, and redemption settings.',
  categories:
    'Set up point categories, print coupons, review inventory, and adjust balances.',
  classroom:
    'Configure Class Awards Live, behavior notes, alerts, and room display.',
  reports: 'Print and export summaries of points, redemptions, and activity.',
  roster: 'Manage direct student links and search your roster. Class students stay visible automatically.',
  coupons: 'Print coupon sheets and award or deduct points in your classes.',
  redemptions: 'Review prize redemption history for your students.',
  insights: 'View school-wide analytics and engagement trends.',
  attendance: 'Configure sign-in rules, period slots, and attendance reporting.',
  displays: 'Set up Smart Screen, bulletin board, and Hall of Fame displays for TVs and monitors.',
  library: 'Catalog books, print labels, and manage checkouts and returns.',
  bonuspoints: 'Create bonus point milestones and achievement rewards.',
  'category-badges':
    'Define badges students earn from category point totals over time.',
  goals: 'Set personal, class, or school goals and track progress.',
  houses: 'Manage house standings, rosters, and competitions.',
  recess: 'Check students out for breaks or bathroom and see who is out now.',
  notifications:
    'Configure automated alerts, email templates, and delivery logs.',
  branding: 'Set school logo, student themes, kiosk layout, and sponsor banners.',
  integrations:
    'Connect roster and sign-in providers such as Google Classroom and Clever.',
  'student-portal':
    'Enable the home portal URL, passcodes, and per-student sign-in options.',
  homework: 'Track homework assignments and classroom completion.',
  raffle: 'Configure weekly raffle rules, ticket pools, and run drawings.',
  'generated-coupons': 'View and manage coupons generated for your classes.',
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

/** Banner copy when a teacher opens a school-wide add-on. */
export function staffPortalSchoolwideTeacherNote(tabValue: string): string | null {
  if (!(STAFF_PORTAL_SCHOOLWIDE_TEACHER_TAB_VALUES as readonly string[]).includes(tabValue)) {
    return null;
  }
  const def = STAFF_PORTAL_TAB_REGISTRY.find((t) => t.value === tabValue);
  const label = def?.label ?? 'This feature';
  return (
    `${label} is a school-wide setting: it can affect every student, family message, kiosk, or portal screen. ` +
    'Coordinate with your school admin and have one designated lead staff member own setup changes so everyone stays aligned.'
  );
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
