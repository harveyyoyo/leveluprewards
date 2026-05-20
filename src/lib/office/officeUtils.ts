import type { OfficeBillingAccount, OfficeGradeEntry, OfficeInvoice } from '@/lib/office/types';
import type { Student } from '@/lib/types';

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

export function studentsWithoutGradesForTerm(
  students: Student[],
  entries: OfficeGradeEntry[],
  termLabel: string,
): Student[] {
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
  activeTerm: string;
  recentGrades: OfficeGradeEntry[];
  recentInvoices: OfficeInvoice[];
};

export function buildOfficeDashboardInsights(
  students: Student[],
  gradeEntries: OfficeGradeEntry[],
  invoices: OfficeInvoice[],
  activeTerm: string,
): OfficeDashboardInsights {
  const overdueInvoices = invoices.filter((i) => isInvoiceOverdue(i));
  const openBalanceCents = invoices
    .filter(isInvoiceOpen)
    .reduce((sum, i) => sum + (i.amountCents || 0), 0);

  return {
    overdueInvoices,
    overdueInvoiceCount: overdueInvoices.length,
    openBalanceCents,
    studentsMissingGrades: studentsWithoutGradesForTerm(students, gradeEntries, activeTerm).length,
    activeTerm,
    recentGrades: gradeEntries.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    recentInvoices: invoices.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
  };
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
