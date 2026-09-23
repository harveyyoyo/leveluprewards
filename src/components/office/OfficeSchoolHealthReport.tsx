'use client';

import { useMemo } from 'react';
import { AlertTriangle, CalendarCheck, CheckCircle2, CreditCard, GraduationCap, Users } from 'lucide-react';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import { OfficeBillingSummaryChart } from '@/components/office/OfficeBillingSummaryChart';
import { useOfficeAttendanceSince } from '@/lib/office/useOfficeAttendance';
import { useOfficeForms } from '@/lib/office/useOfficeForms';
import { formatCents } from '@/lib/office/officeNav';
import { buildOfficeDashboardInsights } from '@/lib/office/officeUtils';
import type { OfficeBillingAccount, OfficeClass, OfficeGradeEntry, OfficeInvoice, OfficeStudent } from '@/lib/office/types';
import { cn } from '@/lib/utils';

type OfficeSchoolHealthReportProps = {
  schoolId: string;
  students: OfficeStudent[];
  classes: OfficeClass[];
  gradeEntries: OfficeGradeEntry[];
  billingAccounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function OfficeSchoolHealthReport({
  schoolId,
  students,
  classes,
  gradeEntries,
  billingAccounts,
  invoices,
}: OfficeSchoolHealthReportProps) {
  const { term } = useOfficeTerm(schoolId);
  const insights = useMemo(
    () => buildOfficeDashboardInsights(students, gradeEntries, invoices, term, billingAccounts),
    [students, gradeEntries, invoices, term, billingAccounts],
  );

  const cutoff = useMemo(() => daysAgoIso(30), []);
  const { entries: attendanceEntries, isLoading: attendanceLoading } = useOfficeAttendanceSince(schoolId, cutoff);
  const attendanceRatePct = useMemo(() => {
    if (attendanceEntries.length === 0) return null;
    const present = attendanceEntries.filter((e) => e.status === 'present').length;
    return Math.round((present / attendanceEntries.length) * 100);
  }, [attendanceEntries]);

  const { forms } = useOfficeForms(schoolId);
  const outstandingForms = useMemo(
    () =>
      forms.reduce(
        (sum, form) => sum + Object.values(form.responses).filter((s) => s === 'sent').length,
        0,
      ),
    [forms],
  );

  const tiles = [
    {
      label: 'Enrollment',
      value: String(students.length),
      sub: `${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`,
      icon: Users,
      tint: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    },
    {
      label: 'Open balance',
      value: formatCents(insights.openBalanceCents),
      sub: `${insights.overdueInvoiceCount} overdue invoice${insights.overdueInvoiceCount === 1 ? '' : 's'}`,
      icon: CreditCard,
      warn: insights.overdueInvoiceCount > 0,
      tintOk: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      tintWarn: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    },
    {
      label: `Grades · ${term}`,
      value: `${insights.gradeCompletionPct}%`,
      sub: `${insights.studentsMissingGrades} student${insights.studentsMissingGrades === 1 ? '' : 's'} missing`,
      icon: GraduationCap,
      warn: insights.studentsMissingGrades > 0,
      tintOk: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      tintWarn: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      label: 'Attendance (30 days)',
      value: attendanceLoading ? '…' : attendanceRatePct == null ? '—' : `${attendanceRatePct}%`,
      sub: attendanceRatePct == null ? 'No attendance recorded yet' : `${attendanceEntries.length} marks`,
      icon: CalendarCheck,
      warn: attendanceRatePct != null && attendanceRatePct < 90,
      tintOk: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      tintWarn: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const tint = 'tintWarn' in tile ? (tile.warn ? tile.tintWarn : tile.tintOk) : tile.tint;
          return (
            <div
              key={tile.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tint)}>
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{tile.label}</p>
              <p className="text-xl font-bold">{tile.value}</p>
              <p className="text-xs text-muted-foreground">{tile.sub}</p>
            </div>
          );
        })}
      </div>

      {invoices.length > 0 ? <OfficeBillingSummaryChart invoices={invoices} /> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Also worth a look</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            {insights.noBillingCount > 0 ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            {insights.noBillingCount} student{insights.noBillingCount === 1 ? '' : 's'} with no billing account linked
          </li>
          <li className="flex items-center gap-2">
            {insights.unassignedCount > 0 ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            {insights.unassignedCount} student{insights.unassignedCount === 1 ? '' : 's'} not assigned to a class
          </li>
          <li className="flex items-center gap-2">
            {outstandingForms > 0 ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            {outstandingForms} permission slip response{outstandingForms === 1 ? '' : 's'} still outstanding
          </li>
        </ul>
      </div>
    </div>
  );
}
