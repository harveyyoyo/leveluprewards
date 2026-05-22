import type { OfficeBillingAccount, OfficeGradeEntry, OfficeInvoice, OfficeStudent } from '@/lib/office/types';

export function getOfficeStudentLabel(student: Pick<OfficeStudent, 'firstName' | 'lastName' | 'nickname'>): string {
  const nick = student.nickname?.trim();
  if (nick) return nick;
  return student.firstName?.trim() || '';
}

export function getOfficeStudentFullName(student: Pick<OfficeStudent, 'firstName' | 'lastName' | 'nickname'>): string {
  return `${getOfficeStudentLabel(student)} ${student.lastName}`.trim();
}

export function getSuggestedTermLabel(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month >= 7) return `Fall ${year}`;
  if (month >= 4) return `Spring ${year}`;
  return `Winter ${year}`;
}

export function formatGradeDisplay(entry: Pick<OfficeGradeEntry, 'letterGrade' | 'numericGrade'>): string {
  const parts: string[] = [];
  if (entry.letterGrade?.trim()) parts.push(entry.letterGrade.trim());
  if (entry.numericGrade != null && Number.isFinite(entry.numericGrade)) {
    parts.push(`${entry.numericGrade}%`);
  }
  return parts.length ? parts.join(' · ') : '—';
}

export function isInvoiceOpen(inv: OfficeInvoice): boolean {
  return inv.status === 'sent' || inv.status === 'draft';
}

export function billingStatusForAccount(
  accountId: string,
  invoices: OfficeInvoice[],
  current: OfficeBillingAccount['status'],
): OfficeBillingAccount['status'] {
  if (current === 'closed') return 'closed';
  const hasOverdue = invoices.some((i) => i.accountId === accountId && isInvoiceOverdue(i));
  return hasOverdue ? 'past_due' : 'active';
}

export function isInvoiceOverdue(inv: OfficeInvoice, today = new Date()): boolean {
  if (!isInvoiceOpen(inv)) return false;
  const due = inv.dueDate?.slice(0, 10);
  if (!due) return false;
  const todayStr = today.toISOString().slice(0, 10);
  return due < todayStr;
}

/** Open invoice due today or within the next N days (not overdue). */
export function isInvoiceDueSoon(inv: OfficeInvoice, withinDays = 7, today = new Date()): boolean {
  if (!isInvoiceOpen(inv)) return false;
  const due = inv.dueDate?.slice(0, 10);
  if (!due) return false;
  const todayStr = today.toISOString().slice(0, 10);
  if (due < todayStr) return false;
  const end = new Date(today);
  end.setDate(end.getDate() + withinDays);
  const endStr = end.toISOString().slice(0, 10);
  return due <= endStr;
}

export function countStudentsWithoutBilling(
  students: OfficeStudent[],
  accounts: OfficeBillingAccount[],
): number {
  const linked = new Set(accounts.flatMap((a) => a.studentIds));
  return students.filter((s) => !linked.has(s.id)).length;
}

export function billingAccountForStudent(
  accounts: OfficeBillingAccount[],
  studentId: string,
): OfficeBillingAccount | undefined {
  return accounts.find((a) => a.studentIds.includes(studentId));
}

export function gradesForStudent(entries: OfficeGradeEntry[], studentId: string): OfficeGradeEntry[] {
  return entries
    .filter((e) => e.studentId === studentId)
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function studentIdsWithGradesForTerm(entries: OfficeGradeEntry[], termLabel: string): Set<string> {
  return new Set(entries.filter((e) => e.termLabel === termLabel).map((e) => e.studentId));
}

export function studentsWithoutGradesForTerm(
  students: OfficeStudent[],
  entries: OfficeGradeEntry[],
  termLabel: string,
): OfficeStudent[] {
  const withGrade = new Set(
    entries.filter((e) => e.termLabel === termLabel).map((e) => e.studentId),
  );
  return students.filter((s) => !withGrade.has(s.id));
}

export type OfficeDashboardInsights = {
  overdueInvoices: OfficeInvoice[];
  overdueInvoiceCount: number;
  openBalanceCents: number;
  studentsMissingGrades: number;
  /** Number of students with at least one grade entry for the active term. */
  studentsGraded: number;
  /** 0–100 rounded percentage of students graded for the active term. */
  gradeCompletionPct: number;
  /** Number of invoices with status 'paid'. */
  paidInvoiceCount: number;
  dueSoonCount: number;
  unassignedCount: number;
  noBillingCount: number;
  activeTerm: string;
  recentGrades: OfficeGradeEntry[];
  recentInvoices: OfficeInvoice[];
};

export function buildOfficeDashboardInsights(
  students: OfficeStudent[],
  gradeEntries: OfficeGradeEntry[],
  invoices: OfficeInvoice[],
  activeTerm: string,
  billingAccounts: OfficeBillingAccount[] = [],
): OfficeDashboardInsights {
  const overdueInvoices = invoices.filter((i) => isInvoiceOverdue(i));
  const openBalanceCents = invoices
    .filter(isInvoiceOpen)
    .reduce((sum, i) => sum + (i.amountCents || 0), 0);
  const missingGrades = studentsWithoutGradesForTerm(students, gradeEntries, activeTerm).length;
  const studentsGraded = students.length - missingGrades;
  const gradeCompletionPct =
    students.length > 0 ? Math.round((studentsGraded / students.length) * 100) : 100;
  const paidInvoiceCount = invoices.filter((i) => i.status === 'paid').length;
  const dueSoonCount = invoices.filter((i) => isInvoiceDueSoon(i)).length;

  return {
    overdueInvoices,
    overdueInvoiceCount: overdueInvoices.length,
    openBalanceCents,
    studentsMissingGrades: missingGrades,
    studentsGraded,
    gradeCompletionPct,
    paidInvoiceCount,
    dueSoonCount,
    unassignedCount: students.filter((s) => !s.classId).length,
    noBillingCount: countStudentsWithoutBilling(students, billingAccounts),
    activeTerm,
    recentGrades: gradeEntries.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    recentInvoices: invoices.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
  };
}

/** ISO date string (YYYY-MM-DD) for invoice due dates. */
export function defaultDueDateIso(daysAhead = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function parseUsdToCents(amount: string): number | null {
  const cents = Math.round(parseFloat(amount) * 100);
  if (!Number.isFinite(cents) || cents < 0) return null;
  return cents;
}

export function uniqueGradeSubjects(entries: OfficeGradeEntry[], extra: string[] = []): string[] {
  const set = new Set<string>([...extra, 'Math', 'English', 'Science', 'History', 'Hebrew', 'Gemara']);
  for (const e of entries) {
    const s = e.subject?.trim();
    if (s) set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function buildInvoiceReminderMailto(params: {
  email: string;
  familyName: string;
  invoiceLabel: string;
  amountCents: number;
  dueDate: string;
  schoolName?: string;
}): string {
  const school = params.schoolName?.trim() || 'your school';
  const amount = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(
    params.amountCents / 100,
  );
  const subject = encodeURIComponent(`Invoice reminder — ${params.invoiceLabel}`);
  const body = encodeURIComponent(
    `Hello ${params.familyName},\n\nThis is a friendly reminder that the following invoice from ${school} is past due:\n\n` +
      `${params.invoiceLabel}: ${amount}\nDue date: ${params.dueDate}\n\nPlease contact the office if you have questions.\n\nThank you.`,
  );
  return `mailto:${params.email}?subject=${subject}&body=${body}`;
}

export function exportOfficeStudentsCsv(
  schoolId: string,
  students: OfficeStudent[],
  classNameById: Map<string, string>,
): void {
  const rows = students.map((s) => [
    s.firstName,
    s.lastName,
    s.nickname ?? '',
    (s.classId && classNameById.get(s.classId)) ?? '',
    s.teacherName ?? '',
    s.notes ?? '',
  ]);
  downloadCsv(`office-roster-${schoolId}.csv`, ['First', 'Last', 'Nickname', 'Class', 'Teacher', 'Notes'], rows);
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const escape = (cell: string) => {
    const v = cell.replace(/"/g, '""');
    return /[",\n]/.test(v) ? `"${v}"` : v;
  };
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
