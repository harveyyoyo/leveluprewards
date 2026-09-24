import type { LucideIcon } from 'lucide-react';
import {
  CalendarCheck,
  CreditCard,
  DoorOpen,
  FileText,
  GraduationCap,
  Bus,
  Home,
  LayoutGrid,
  Megaphone,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import { officePublicHref } from '@/lib/officePublicUrl';
import { getOfficeMarksLabels } from '@/lib/office/officeTerminology';
import type { OfficeSettings } from '@/lib/office/types';

export type OfficeNavId =
  | 'home'
  | 'students'
  | 'classes'
  | 'teachers'
  | 'grades'
  | 'attendance'
  | 'frontdesk'
  | 'transportation'
  | 'communication'
  | 'reports'
  | 'billing'
  | 'settings';

export type OfficeNavItem = {
  id: OfficeNavId;
  label: string;
  description: string;
  /** One or two plain sentences on what the page is for (shown under the page title). */
  explainer: string;
  href: (schoolId: string) => string;
  icon: LucideIcon;
};

export function getOfficeNavItems(settings?: Pick<OfficeSettings, 'useMarksTerminology' | 'features'> | null): OfficeNavItem[] {
  const marks = getOfficeMarksLabels(settings);
  const showAttendance = settings?.features?.attendance !== false;
  const showFrontDesk = settings?.features?.frontDesk !== false;
  const showTransportation = settings?.features?.busInfo !== false;

  return [
    {
      id: 'home',
      label: 'Home',
      description: 'Overview and quick actions',
      explainer: 'Ask about your school — like who is absent or which families owe money — or how to do anything here.',
      href: (schoolId) => officePublicHref(schoolId),
      icon: Home,
    },
    {
      id: 'students',
      label: 'Students',
      description: 'Roster and family profiles',
      explainer: 'Every student\'s record: class, teachers, family, grades, bills, documents, and history. Click a name to open their card.',
      href: (schoolId) => officePublicHref(schoolId, 'students'),
      icon: Users,
    },
    {
      id: 'classes',
      label: 'Classes',
      description: 'Group students by class',
      explainer: 'Groups of students. Click a class name to set its teachers and weekly schedule.',
      href: (schoolId) => officePublicHref(schoolId, 'classes'),
      icon: LayoutGrid,
    },
    {
      id: 'teachers',
      label: 'Teachers',
      description: 'Homeroom teachers',
      explainer: 'Your teachers. Click one to see their classes, students, and weekly schedule.',
      href: (schoolId) => officePublicHref(schoolId, 'teachers'),
      icon: UserRound,
    },
    {
      id: 'grades',
      label: marks.section,
      description: marks.enterAction,
      explainer: `Enter and review ${marks.plural} by term. Pick the term at the top; use More to import, fill in missing ${marks.plural}, or print.`,
      href: (schoolId) => officePublicHref(schoolId, 'grades'),
      icon: GraduationCap,
    },
    ...(showAttendance
      ? [
          {
            id: 'attendance' as const,
            label: 'Attendance',
            description: 'Daily present / absent',
            explainer: 'Mark who\'s present, absent, late, or excused, one class and one day at a time.',
            href: (schoolId: string) => officePublicHref(schoolId, 'attendance'),
            icon: CalendarCheck,
          },
        ]
      : []),
    ...(showFrontDesk
      ? [
          {
            id: 'frontdesk' as const,
            label: 'Front desk',
            description: 'Late arrivals, early pickups, nurse visits',
            explainer: 'Log what happens at the office door: students who come in late, leave early (and who picked them up), and nurse visits.',
            href: (schoolId: string) => officePublicHref(schoolId, 'front-desk'),
            icon: DoorOpen,
          },
        ]
      : []),
    ...(showTransportation
      ? [
          {
            id: 'transportation' as const,
            label: 'Transportation',
            description: 'Buses, routes, and live map',
            explainer: 'See every bus live on a map, set up routes and stops, choose how each student gets home, and look back at past trips. Drivers use Drive on their phone.',
            href: (schoolId: string) => officePublicHref(schoolId, 'transportation'),
            icon: Bus,
          },
        ]
      : []),
    {
      id: 'communication',
      label: 'Communication',
      description: 'Announcements & forms',
      explainer: 'Email families, send permission slips and see who returned them, and keep the school calendar.',
      href: (schoolId) => officePublicHref(schoolId, 'communication'),
      icon: Megaphone,
    },
    {
      id: 'reports',
      label: 'Reports',
      description: 'Filtered views and exports',
      explainer: 'Print or download grades, billing statements, class lists, and the full change history.',
      href: (schoolId) => officePublicHref(schoolId, 'reports'),
      icon: FileText,
    },
    {
      id: 'billing',
      label: 'Billing',
      description: 'Family invoices and payments',
      explainer: 'Family bills and payments. Record checks, cash, or transfers; one payment can cover several bills.',
      href: (schoolId) => officePublicHref(schoolId, 'billing'),
      icon: CreditCard,
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Terms, staff accounts, import',
      explainer: 'School-wide choices: terms, which sections are on, extra student fields, staff sign-ins, and importing data.',
      href: (schoolId) => officePublicHref(schoolId, 'settings'),
      icon: Settings,
    },
  ];
}

/** @deprecated Use `getOfficeNavItems(settings)` for marks-aware labels. */
export const OFFICE_NAV_ITEMS: OfficeNavItem[] = getOfficeNavItems();

export function officeNavIdFromPath(pathname: string, schoolId: string): OfficeNavId {
  const school = schoolId.toLowerCase();
  const internalPrefix = `/${school}/office`;
  const externalPrefix = `/${school}`;

  let rest = '';
  if (pathname.startsWith(internalPrefix)) {
    rest = pathname.slice(internalPrefix.length).replace(/^\//, '');
  } else if (pathname === externalPrefix || pathname.startsWith(`${externalPrefix}/`)) {
    rest = pathname.slice(externalPrefix.length).replace(/^\//, '');
  } else {
    return 'home';
  }
  if (rest.startsWith('students')) return 'students';
  if (rest.startsWith('classes')) return 'classes';
  if (rest.startsWith('teachers')) return 'teachers';
  if (rest.startsWith('grades')) return 'grades';
  if (rest.startsWith('attendance')) return 'attendance';
  if (rest.startsWith('front-desk')) return 'frontdesk';
  if (rest.startsWith('transportation')) return 'transportation';
  if (rest.startsWith('communication')) return 'communication';
  if (rest.startsWith('reports')) return 'reports';
  if (rest.startsWith('billing')) return 'billing';
  if (rest.startsWith('settings')) return 'settings';
  return 'home';
}

export function formatCents(cents: number): string {
  const n = Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n / 100);
}

/**
 * Where a how-to answer can take someone: a page, and sometimes the option on it
 * (`action=add` opens the Add form; Settings opens on a tab). The assistant picks one by key.
 */
export const OFFICE_GO_TARGETS = {
  home: { page: 'home' },
  students: { page: 'students' },
  'students:add': { page: 'students', params: { action: 'add' } },
  classes: { page: 'classes' },
  'classes:add': { page: 'classes', params: { action: 'add' } },
  teachers: { page: 'teachers' },
  'teachers:add': { page: 'teachers', params: { action: 'add' } },
  grades: { page: 'grades' },
  attendance: { page: 'attendance' },
  frontdesk: { page: 'frontdesk' },
  transportation: { page: 'transportation' },
  communication: { page: 'communication' },
  reports: { page: 'reports' },
  billing: { page: 'billing' },
  'billing:new-invoice': { page: 'billing', params: { action: 'new-invoice' } },
  settings: { page: 'settings' },
  'settings:school': { page: 'settings', params: { tab: 'school' } },
  'settings:fields': { page: 'settings', params: { tab: 'fields' } },
  'settings:staff': { page: 'settings', params: { tab: 'staff' } },
  'settings:import': { page: 'settings', params: { tab: 'import' } },
  'settings:customize': { page: 'settings', params: { tab: 'customize' } },
} as const satisfies Record<string, { page: OfficeNavId; params?: Record<string, string> }>;

export type OfficeGoTarget = keyof typeof OFFICE_GO_TARGETS;

/** The link for a go-to key, or null for an unknown key or a page that's turned off. */
export function officeGoHref(
  schoolId: string,
  key: string,
  settings?: Pick<OfficeSettings, 'useMarksTerminology' | 'features'> | null,
): string | null {
  if (!Object.prototype.hasOwnProperty.call(OFFICE_GO_TARGETS, key)) return null;
  const target: { page: OfficeNavId; params?: Record<string, string> } = OFFICE_GO_TARGETS[key as OfficeGoTarget];
  const item = getOfficeNavItems(settings).find((i) => i.id === target.page);
  if (!item) return null;
  const href = item.href(schoolId);
  return target.params ? `${href}?${new URLSearchParams(target.params).toString()}` : href;
}
