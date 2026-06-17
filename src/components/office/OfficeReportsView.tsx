'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OfficeGradeReportView } from '@/components/office/OfficeGradeReportView';
import { useOfficeUrlSync } from '@/lib/office/useOfficeUrlSync';
import { useOfficeSettings } from '@/lib/office/useOfficeSettings';
import { formatCents } from '@/lib/office/officeNav';
import { invoiceRemainingCents } from '@/lib/office/officeBillingPayments';
import {
  buildOfficeDocumentShell,
  buildOfficeFamilyStatementHtml,
  escapeOfficePrintHtml,
  openOfficePrintDocument,
} from '@/lib/office/officePrintUtils';
import {
  buildOverdueFamiliesDigest,
  getOfficeStudentFullName,
  getOfficeTeacherLabel,
  isInvoiceOverdue,
} from '@/lib/office/officeUtils';
import { OFFICE_REPORTS, parseOfficeReportId, type OfficeReportId } from '@/lib/office/officeReports';
import type {
  OfficeBillingAccount,
  OfficeClass,
  OfficeGradeEntry,
  OfficeInvoice,
  OfficeStudent,
} from '@/lib/office/types';
import { cn } from '@/lib/utils';
import { OfficeEntityLink } from '@/components/office/OfficeEntityLink';
import { useToast } from '@/hooks/use-toast';

type OfficeReportsViewProps = {
  schoolId: string;
  schoolName?: string;
  gradeEntries: OfficeGradeEntry[];
  students: OfficeStudent[];
  classes: OfficeClass[];
  billingAccounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
  studentLabelById: Map<string, string>;
  classNameById: Map<string, string>;
  teacherNameById: Map<string, string>;
};

export function OfficeReportsView({
  schoolId,
  schoolName,
  gradeEntries,
  students,
  classes,
  billingAccounts,
  invoices,
  studentLabelById,
  classNameById,
  teacherNameById,
}: OfficeReportsViewProps) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { settings } = useOfficeSettings(schoolId);
  const [reportId, setReportId] = useState<OfficeReportId>(() =>
    parseOfficeReportId(searchParams.get('report')),
  );
  const [billingAccountId, setBillingAccountId] = useState('all');
  const [rosterClassId, setRosterClassId] = useState('all');

  const displaySchool =
    settings?.statementSchoolName?.trim() || schoolName?.trim() || schoolId;

  useEffect(() => {
    setReportId(parseOfficeReportId(searchParams.get('report')));
    const account = searchParams.get('account')?.trim();
    if (account) setBillingAccountId(account);
  }, [searchParams]);

  useOfficeUrlSync({
    report: reportId === 'grades' ? undefined : reportId,
    account: reportId === 'billing' && billingAccountId !== 'all' ? billingAccountId : undefined,
  });

  const sortedStudents = useMemo(
    () =>
      students
        .slice()
        .sort((a, b) => getOfficeStudentFullName(a).localeCompare(getOfficeStudentFullName(b))),
    [students],
  );

  const rosterStudents = useMemo(() => {
    if (rosterClassId === 'all') return sortedStudents;
    if (rosterClassId === 'unassigned') {
      return sortedStudents.filter((s) => !s.classId);
    }
    return sortedStudents.filter((s) => s.classId === rosterClassId);
  }, [sortedStudents, rosterClassId]);

  const classSections = useMemo(() => {
    const byClass = new Map<string, OfficeStudent[]>();
    for (const student of sortedStudents) {
      const key = student.classId || '__unassigned__';
      const list = byClass.get(key) ?? [];
      list.push(student);
      byClass.set(key, list);
    }
    return Array.from(byClass.entries())
      .map(([classId, list]) => ({
        classId,
        className:
          classId === '__unassigned__'
            ? 'Unassigned'
            : classNameById.get(classId) ?? 'Class',
        students: list,
      }))
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [sortedStudents, classNameById]);

  const overdueRows = useMemo(
    () => buildOverdueFamiliesDigest(billingAccounts, invoices),
    [billingAccounts, invoices],
  );

  const overdueInvoices = useMemo(
    () => invoices.filter((i) => isInvoiceOverdue(i)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [invoices],
  );

  const printBillingStatements = () => {
    const targets =
      billingAccountId === 'all'
        ? billingAccounts
        : billingAccounts.filter((a) => a.id === billingAccountId);
    if (targets.length === 0) {
      toast({ variant: 'destructive', title: 'No billing accounts to print.' });
      return;
    }
    const sections = targets
      .map((account) => {
        const studentLabels = (account.studentIds ?? [])
          .map((id) => studentLabelById.get(id))
          .filter((x): x is string => Boolean(x));
        const inner = buildOfficeFamilyStatementHtml({
          account,
          invoices,
          studentLabels,
          schoolLabel: displaySchool,
        });
        const bodyMatch = inner.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        return bodyMatch?.[1] ?? '';
      })
      .join('<div style="page-break-before:always"></div>');
    const html = buildOfficeDocumentShell({
      title: billingAccountId === 'all' ? 'Billing statements' : 'Billing statement',
      schoolLabel: displaySchool,
      subtitle:
        billingAccountId === 'all'
          ? `${targets.length} families`
          : targets[0]?.familyName ?? undefined,
      bodyHtml: sections,
    });
    if (!openOfficePrintDocument(html)) {
      toast({ variant: 'destructive', title: 'Pop-up blocked', description: 'Allow pop-ups to print.' });
    }
  };

  const printStudentRoster = () => {
    const rows = rosterStudents
      .map(
        (student) => `
        <tr>
          <td>${escapeOfficePrintHtml(getOfficeStudentFullName(student))}</td>
          <td>${escapeOfficePrintHtml((student.classId && classNameById.get(student.classId)) || '—')}</td>
          <td>${escapeOfficePrintHtml(getOfficeTeacherLabel(student, teacherNameById) || '—')}</td>
        </tr>`,
      )
      .join('');
    const html = buildOfficeDocumentShell({
      title: 'Student roster',
      schoolLabel: displaySchool,
      subtitle:
        rosterClassId === 'all'
          ? `${rosterStudents.length} students`
          : `${rosterStudents.length} students · ${classNameById.get(rosterClassId) ?? 'Filtered'}`,
      bodyHtml: `<table><thead><tr><th>Student</th><th>Class</th><th>Teacher</th></tr></thead><tbody>${rows}</tbody></table>`,
    });
    if (!openOfficePrintDocument(html)) {
      toast({ variant: 'destructive', title: 'Pop-up blocked', description: 'Allow pop-ups to print.' });
    }
  };

  const printClassRosters = () => {
    const sections = classSections
      .map(
        (section) => `
        <section class="section">
          <h2>${escapeOfficePrintHtml(section.className)} (${section.students.length})</h2>
          <ul>${section.students
            .map(
              (student) =>
                `<li>${escapeOfficePrintHtml(getOfficeStudentFullName(student))}${
                  getOfficeTeacherLabel(student, teacherNameById)
                    ? ` · ${escapeOfficePrintHtml(getOfficeTeacherLabel(student, teacherNameById))}`
                    : ''
                }</li>`,
            )
            .join('')}</ul>
        </section>`,
      )
      .join('');
    const html = buildOfficeDocumentShell({
      title: 'Class rosters',
      schoolLabel: displaySchool,
      subtitle: `${classSections.length} groups · ${sortedStudents.length} students`,
      bodyHtml: sections || '<p class="muted">No students on the roster.</p>',
    });
    if (!openOfficePrintDocument(html)) {
      toast({ variant: 'destructive', title: 'Pop-up blocked', description: 'Allow pop-ups to print.' });
    }
  };

  const printOverdueBilling = () => {
    const familyRows = overdueRows
      .map(
        (row) => `
        <tr>
          <td>${escapeOfficePrintHtml(row.familyName)}</td>
          <td>${row.invoiceCount}</td>
          <td>${escapeOfficePrintHtml(row.oldestDueDate)}</td>
          <td style="text-align:right">${formatCents(row.totalCents)}</td>
        </tr>`,
      )
      .join('');
    const invoiceRows = overdueInvoices
      .map((inv) => {
        const account = billingAccounts.find((a) => a.id === inv.accountId);
        return `
        <tr>
          <td>${escapeOfficePrintHtml(account?.familyName ?? 'Account')}</td>
          <td>${escapeOfficePrintHtml(inv.label)}</td>
          <td>${escapeOfficePrintHtml(inv.dueDate)}</td>
          <td style="text-align:right">${formatCents(invoiceRemainingCents(inv))}</td>
        </tr>`;
      })
      .join('');
    const html = buildOfficeDocumentShell({
      title: 'Overdue billing report',
      schoolLabel: displaySchool,
      subtitle: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? '' : 's'}`,
      bodyHtml: `
        <h2>By family</h2>
        <table><thead><tr><th>Family</th><th>Invoices</th><th>Oldest due</th><th>Remaining</th></tr></thead><tbody>${familyRows || '<tr><td colspan="4">No overdue families.</td></tr>'}</tbody></table>
        <h2>Invoice detail</h2>
        <table><thead><tr><th>Family</th><th>Description</th><th>Due</th><th>Remaining</th></tr></thead><tbody>${invoiceRows || '<tr><td colspan="4">No overdue invoices.</td></tr>'}</tbody></table>`,
    });
    if (!openOfficePrintDocument(html)) {
      toast({ variant: 'destructive', title: 'Pop-up blocked', description: 'Allow pop-ups to print.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print space-y-2">
        <h2 className="text-lg font-bold">Reports</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Print grades, billing statements, rosters, and other school office documents. Pick a report type,
          adjust filters, then print or export.
        </p>
      </div>

      <div className="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {OFFICE_REPORTS.map((report) => {
          const Icon = report.icon;
          const active = report.id === reportId;
          return (
            <button
              key={report.id}
              type="button"
              onClick={() => setReportId(report.id)}
              className={cn(
                'rounded-2xl border p-4 text-left transition-colors',
                active
                  ? 'border-teal-300 bg-teal-50/80 shadow-sm dark:border-teal-800 dark:bg-teal-950/30'
                  : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-900',
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    active ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold">{report.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {reportId === 'grades' ? (
        <OfficeGradeReportView
          embedded
          schoolId={schoolId}
          schoolName={schoolName}
          entries={gradeEntries}
          studentLabelById={studentLabelById}
          classNameById={classNameById}
        />
      ) : null}

      {reportId === 'billing' ? (
        <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between no-print">
            <div>
              <h3 className="text-base font-bold">Billing statements</h3>
              <p className="text-sm text-muted-foreground">Print invoice history and open balances for families.</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Family</Label>
                <Select value={billingAccountId} onValueChange={setBillingAccountId}>
                  <SelectTrigger className="h-9 w-52 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All families</SelectItem>
                    {billingAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.familyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" className="rounded-xl gap-2" onClick={printBillingStatements}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground no-print">
            Includes amount, paid, and remaining columns for each invoice.
          </p>
        </section>
      ) : null}

      {reportId === 'students' ? (
        <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between no-print">
            <div>
              <h3 className="text-base font-bold">Student roster</h3>
              <p className="text-sm text-muted-foreground">Print the full roster or filter by class.</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Class</Label>
                <Select value={rosterClassId} onValueChange={setRosterClassId}>
                  <SelectTrigger className="h-9 w-44 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" className="rounded-xl gap-2" onClick={printStudentRoster}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-bold uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Class</th>
                  <th className="py-2">Teacher</th>
                </tr>
              </thead>
              <tbody>
                {rosterStudents.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="py-2 pr-3 font-medium">{getOfficeStudentFullName(student)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {(student.classId && classNameById.get(student.classId)) || '—'}
                    </td>
                    <td className="py-2">
                      {student.teacherId ? (
                        <OfficeEntityLink
                          kind="teacher"
                          id={student.teacherId}
                          label={getOfficeTeacherLabel(student, teacherNameById)}
                          muted
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {reportId === 'classes' ? (
        <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between no-print">
            <div>
              <h3 className="text-base font-bold">Class rosters</h3>
              <p className="text-sm text-muted-foreground">Print one page per homeroom with student names.</p>
            </div>
            <Button type="button" className="rounded-xl gap-2" onClick={printClassRosters}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {classSections.map((section) => (
              <article key={section.classId} className="rounded-xl border p-4 dark:border-slate-800">
                <h4 className="font-semibold">
                  {section.className}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({section.students.length})
                  </span>
                </h4>
                <ul className="mt-3 space-y-1 text-sm">
                  {section.students.map((student) => (
                    <li key={student.id}>{getOfficeStudentFullName(student)}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {reportId === 'overdue' ? (
        <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between no-print">
            <div>
              <h3 className="text-base font-bold">Overdue billing</h3>
              <p className="text-sm text-muted-foreground">
                Families and invoices with balances past the due date.
              </p>
            </div>
            <Button
              type="button"
              className="rounded-xl gap-2"
              onClick={printOverdueBilling}
              disabled={overdueInvoices.length === 0}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
          {overdueInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overdue invoices right now.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-bold uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Family</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Due</th>
                  <th className="py-2">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {overdueInvoices.map((inv) => {
                  const account = billingAccounts.find((a) => a.id === inv.accountId);
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="py-2 pr-3 font-medium">{account?.familyName ?? '—'}</td>
                      <td className="py-2 pr-3">{inv.label}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{inv.dueDate}</td>
                      <td className="py-2">{formatCents(invoiceRemainingCents(inv))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </div>
  );
}
