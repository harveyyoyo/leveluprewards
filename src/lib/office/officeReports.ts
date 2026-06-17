import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CreditCard, GraduationCap, LayoutGrid, Users } from 'lucide-react';

export type OfficeReportId = 'grades' | 'billing' | 'students' | 'classes' | 'overdue';

export type OfficeReportDefinition = {
  id: OfficeReportId;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const OFFICE_REPORTS: OfficeReportDefinition[] = [
  {
    id: 'grades',
    label: 'Grade report',
    description: 'Term grades by student or class',
    icon: GraduationCap,
  },
  {
    id: 'billing',
    label: 'Billing statements',
    description: 'Family invoice statements',
    icon: CreditCard,
  },
  {
    id: 'students',
    label: 'Student roster',
    description: 'All students with class and teacher',
    icon: Users,
  },
  {
    id: 'classes',
    label: 'Class rosters',
    description: 'Students grouped by homeroom',
    icon: LayoutGrid,
  },
  {
    id: 'overdue',
    label: 'Overdue billing',
    description: 'Past-due invoices by family',
    icon: AlertCircle,
  },
];

export function parseOfficeReportId(value: string | null | undefined): OfficeReportId {
  if (value === 'billing' || value === 'students' || value === 'classes' || value === 'overdue') {
    return value;
  }
  return 'grades';
}
