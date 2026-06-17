import type { LucideIcon } from 'lucide-react';
import { CreditCard, FileText, GraduationCap, Home, LayoutGrid, Settings, UserRound, Users } from 'lucide-react';
import { officePublicHref } from '@/lib/officePublicUrl';
import { getOfficeMarksLabels } from '@/lib/office/officeTerminology';
import type { OfficeSettings } from '@/lib/office/types';

export type OfficeNavId =
  | 'home'
  | 'students'
  | 'classes'
  | 'teachers'
  | 'grades'
  | 'reports'
  | 'billing'
  | 'settings';

export type OfficeNavItem = {
  id: OfficeNavId;
  label: string;
  description: string;
  href: (schoolId: string) => string;
  icon: LucideIcon;
};

export function getOfficeNavItems(settings?: Pick<OfficeSettings, 'useMarksTerminology'> | null): OfficeNavItem[] {
  const marks = getOfficeMarksLabels(settings);
  return [
    {
      id: 'home',
      label: 'Home',
      description: 'Overview and quick actions',
      href: (schoolId) => officePublicHref(schoolId),
      icon: Home,
    },
    {
      id: 'students',
      label: 'Students',
      description: 'Roster and family profiles',
      href: (schoolId) => officePublicHref(schoolId, 'students'),
      icon: Users,
    },
    {
      id: 'classes',
      label: 'Classes',
      description: 'Group students by class',
      href: (schoolId) => officePublicHref(schoolId, 'classes'),
      icon: LayoutGrid,
    },
    {
      id: 'teachers',
      label: 'Teachers',
      description: 'Homeroom teachers',
      href: (schoolId) => officePublicHref(schoolId, 'teachers'),
      icon: UserRound,
    },
    {
      id: 'grades',
      label: marks.section,
      description: marks.enterAction,
      href: (schoolId) => officePublicHref(schoolId, 'grades'),
      icon: GraduationCap,
    },
    {
      id: 'reports',
      label: 'Reports',
      description: 'Filtered views and exports',
      href: (schoolId) => officePublicHref(schoolId, 'reports'),
      icon: FileText,
    },
    {
      id: 'billing',
      label: 'Billing',
      description: 'Family invoices and payments',
      href: (schoolId) => officePublicHref(schoolId, 'billing'),
      icon: CreditCard,
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Terms, staff accounts, import',
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
  if (rest.startsWith('reports')) return 'reports';
  if (rest.startsWith('billing')) return 'billing';
  if (rest.startsWith('settings')) return 'settings';
  return 'home';
}

export function formatCents(cents: number): string {
  const n = Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n / 100);
}
