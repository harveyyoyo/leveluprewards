import type { LucideIcon } from 'lucide-react';
import { CreditCard, FileText, GraduationCap, Home, LayoutGrid, Users } from 'lucide-react';
import { officePublicHref } from '@/lib/officePublicUrl';

export type OfficeNavId = 'home' | 'students' | 'classes' | 'grades' | 'billing' | 'reports';

export type OfficeNavItem = {
  id: OfficeNavId;
  label: string;
  description: string;
  href: (schoolId: string) => string;
  icon: LucideIcon;
};

export const OFFICE_NAV_ITEMS: OfficeNavItem[] = [
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
    description: 'Office roster (separate from rewards)',
    href: (schoolId) => officePublicHref(schoolId, 'students'),
    icon: Users,
  },
  {
    id: 'classes',
    label: 'Classes',
    description: 'Students grouped by class',
    href: (schoolId) => officePublicHref(schoolId, 'classes'),
    icon: LayoutGrid,
  },
  {
    id: 'grades',
    label: 'Grades',
    description: 'Report cards and term grades',
    href: (schoolId) => officePublicHref(schoolId, 'grades'),
    icon: GraduationCap,
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Family accounts and invoices',
    href: (schoolId) => `/${schoolId}/office/billing`,
    icon: CreditCard,
  },
];

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
  if (rest.startsWith('grades')) return 'grades';
  if (rest.startsWith('billing')) return 'billing';
  if (rest.startsWith('reports')) return 'reports';
  return 'home';
}

export function formatCents(cents: number): string {
  const n = Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n / 100);
}
