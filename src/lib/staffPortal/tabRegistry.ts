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
  Megaphone,
  Palette,
  Plug,
  Tag,
  Target,
  Ticket,
  Trophy,
  User,
  Users,
  Database,
} from 'lucide-react';
import type { Settings } from '@/components/providers/SettingsProvider';
import type { StaffPortalRole, StaffPortalTabDef } from './types';

function teacherAddonHidden(settings: Settings, tabValue: string): boolean {
  return (settings.teacherHiddenAddOnTabs || []).includes(tabValue);
}

function adminAddonHidden(settings: Settings, tabValue: string): boolean {
  return (settings.adminHiddenAddOnTabs || []).includes(tabValue);
}

/** All staff portal tabs (admin + teacher + shared add-ons). */
export const STAFF_PORTAL_TAB_REGISTRY: StaffPortalTabDef[] = [
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
    isEnabled: () => true,
  },
  {
    value: 'categories',
    label: 'Points',
    icon: Tag,
    kind: 'core',
    roles: ['admin'],
    title: 'Point categories (school setup)',
    isEnabled: () => true,
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
    isEnabled: () => true,
  },
  {
    value: 'redemptions',
    label: 'Redemptions',
    icon: History,
    kind: 'core',
    roles: ['teacher'],
    isEnabled: () => true,
  },
  {
    value: 'raffle',
    label: 'Raffle',
    icon: Dices,
    kind: 'core',
    roles: ['teacher'],
    isEnabled: (s) => !!s.enableWeeklyRaffle,
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
    isEnabled: (s, role) => {
      if (role === 'teacher') {
        if (teacherAddonHidden(s, 'attendance')) return false;
        return (s.payAttendance ?? true) && !!s.enableAttendance;
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
    isEnabled: (s, role) => {
      if (role === 'teacher' && teacherAddonHidden(s, 'goals')) return false;
      return !!s.enableGoals;
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
      if (role === 'teacher' && teacherAddonHidden(s, 'homework')) return false;
      return !!s.enableHomework;
    },
  },
  {
    value: 'generated-coupons',
    label: 'Coupons',
    icon: Ticket,
    kind: 'addon',
    roles: ['teacher'],
    isEnabled: (s, role) => {
      if (role === 'teacher' && teacherAddonHidden(s, 'generated-coupons')) return false;
      return !!s.enableTeacherGeneratedCouponsTab;
    },
  },
  {
    value: 'backups',
    label: 'Backups',
    icon: Database,
    kind: 'addon',
    roles: ['admin'],
    isEnabled: (_s, role) => role === 'admin',
  },
];

export function staffPortalTabsForRole(
  role: StaffPortalRole,
  settings: Settings,
  options?: { includeDeveloperBackups?: boolean },
): StaffPortalTabDef[] {
  return STAFF_PORTAL_TAB_REGISTRY.filter((tab) => {
    if (!tab.roles.includes(role)) return false;
    if (tab.value === 'backups' && !options?.includeDeveloperBackups) return false;
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
export function staffPortalDefaultTab(role: StaffPortalRole): string {
  if (role === 'secretary') return 'coupons';
  if (role === 'teacher') return 'coupons';
  return 'students';
}
