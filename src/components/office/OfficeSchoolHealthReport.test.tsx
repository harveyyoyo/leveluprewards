import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OfficeSchoolHealthReport } from './OfficeSchoolHealthReport';
import type { OfficeAttendanceEntry, OfficeBillingAccount, OfficeClass, OfficeInvoice, OfficeStudent } from '@/lib/office/types';

vi.mock('@/lib/office/useOfficeTerm', () => ({
  useOfficeTerm: () => ({ term: 'Spring 2026', setTerm: vi.fn(), suggestedTerm: 'Spring 2026', configuredTerms: [] }),
}));

let attendanceEntries: OfficeAttendanceEntry[] = [];
vi.mock('@/lib/office/useOfficeAttendance', () => ({
  useOfficeAttendanceSince: () => ({ entries: attendanceEntries, isLoading: false }),
}));

vi.mock('@/lib/office/useOfficeForms', () => ({
  useOfficeForms: () => ({ forms: [], isLoading: false }),
}));

const students: OfficeStudent[] = [
  { id: 's1', firstName: 'A', lastName: 'K', classId: 'c1', updatedAt: 0 },
  { id: 's2', firstName: 'B', lastName: 'L', updatedAt: 0 },
];
const classes: OfficeClass[] = [{ id: 'c1', name: 'Shiur Aleph', updatedAt: 0 }];
const billingAccounts: OfficeBillingAccount[] = [];
const invoices: OfficeInvoice[] = [];

describe('OfficeSchoolHealthReport', () => {
  it('shows enrollment and an attendance rate computed from present/total marks', () => {
    attendanceEntries = [
      { id: 'a1', studentId: 's1', classId: 'c1', date: '2026-01-05', status: 'present', updatedAt: 0 },
      { id: 'a2', studentId: 's2', classId: 'c1', date: '2026-01-05', status: 'absent', updatedAt: 0 },
      { id: 'a3', studentId: 's1', classId: 'c1', date: '2026-01-06', status: 'present', updatedAt: 0 },
      { id: 'a4', studentId: 's2', classId: 'c1', date: '2026-01-06', status: 'present', updatedAt: 0 },
    ];
    render(
      <OfficeSchoolHealthReport
        schoolId="yeshiva"
        students={students}
        classes={classes}
        gradeEntries={[]}
        billingAccounts={billingAccounts}
        invoices={invoices}
      />,
    );

    expect(screen.getByText('2')).toBeInTheDocument(); // enrollment
    expect(screen.getByText('75%')).toBeInTheDocument(); // 3 present / 4 marks
    expect(screen.getByText('1 student not assigned to a class')).toBeInTheDocument();
  });

  it('shows an em dash when there is no attendance data yet', () => {
    attendanceEntries = [];
    render(
      <OfficeSchoolHealthReport
        schoolId="yeshiva"
        students={students}
        classes={classes}
        gradeEntries={[]}
        billingAccounts={billingAccounts}
        invoices={invoices}
      />,
    );
    expect(screen.getByText('No attendance recorded yet')).toBeInTheDocument();
  });
});
