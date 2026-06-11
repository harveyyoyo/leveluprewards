import type {
  OfficeBillingAccount,
  OfficeGradeEntry,
  OfficeInvoice,
  OfficeStudent,
  OfficeTeacher,
} from '@/lib/office/types';
import { joinDisplayParts, safeFiniteNumber, safeString } from '@/lib/safeDisplayValue';

export function getOfficeStudentLabel(student: Pick<OfficeStudent, 'firstName' | 'lastName' | 'nickname'>): string {
  const nick = safeString(student.nickname);
  if (nick) return nick;
  return safeString(student.firstName);
}

export function getOfficeStudentFullName(student: Pick<OfficeStudent, 'firstName' | 'lastName' | 'nickname'>): string {
  const nick = safeString(student.nickname);
  if (nick) return nick;
  return joinDisplayParts([student.firstName, student.lastName]);
}

export function getOfficeTeacherLabel(
  student: Pick<OfficeStudent, 'teacherId' | 'teacherName'>,
  teacherNameById: Map<string, string>,
): string {
  const id = safeString(student.teacherId);
  if (id) {
    const fromRoster = safeString(teacherNameById.get(id));
    if (fromRoster) return fromRoster;
  }
  return safeString(student.teacherName);
}

export function officeStudentHasTeacher(
  student: Pick<OfficeStudent, 'teacherId' | 'teacherName'>,
): boolean {
  return Boolean(student.teacherId?.trim() || student.teacherName?.trim());
}

export function resolveOfficeTeacherIdByName(
  teachers: OfficeTeacher[],
  name: string | null | undefined,
): string | null {
  const needle = safeString(name).toLowerCase();
  if (!needle) return null;
  const hit = teachers.find((t) => safeString(t.name).toLowerCase() === needle);
  return hit?.id ?? null;
}

export function countOfficeStudentsByTeacher(
  students: OfficeStudent[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of students) {
    const id = s.teacherId?.trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function getSuggestedTermLabel(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month >= 7) return `Fall ${year}`;
  if (month >= 4) return `Spring ${year}`;
  return `Winter ${year}`;
}

const TERM_SEASON_ORDER: Record<string, number> = { Fall: 3, Spring: 2, Winter: 1 };

function parseTermLabel(label: string): { season: string; year: number } | null {
  const m = label.trim().match(/^(Fall|Spring|Winter)\s+(\d{4})$/i);
  if (!m) return null;
  const season = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  return { season, year: Number(m[2]) };
}

/** Previous season label for standard Fall / Spring / Winter terms. */
export function priorTermLabel(active: string): string {
  const parsed = parseTermLabel(active);
  if (!parsed) return '';
  const { season, year } = parsed;
  if (season === 'Fall') return `Spring ${year}`;
  if (season === 'Spring') return `Winter ${year}`;
  return `Fall ${year - 1}`;
}

export function compareOfficeTermLabels(a: string, b: string): number {
  const pa = parseTermLabel(a);
  const pb = parseTermLabel(b);
  if (pa && pb) {
    if (pa.year !== pb.year) return pb.year - pa.year;
    return (TERM_SEASON_ORDER[pb.season] ?? 0) - (TERM_SEASON_ORDER[pa.season] ?? 0);
  }
  return a.localeCompare(b);
}

/** Distinct term choices for working-term dropdowns (newest first). */
export function collectOfficeTermOptions(params: {
  gradeEntries?: Pick<OfficeGradeEntry, 'termLabel'>[];
  activeTerm?: string;
  schoolDefaultTerm?: string | null;
  configuredTerms?: string[];
}): string[] {
  const set = new Set<string>();
  const suggested = getSuggestedTermLabel();
  set.add(suggested);
  const prior = priorTermLabel(suggested);
  if (prior) set.add(prior);
  if (params.schoolDefaultTerm?.trim()) set.add(params.schoolDefaultTerm.trim());
  if (params.activeTerm?.trim()) set.add(params.activeTerm.trim());
  for (const t of params.configuredTerms ?? []) {
    if (t.trim()) set.add(t.trim());
  }
  for (const e of params.gradeEntries ?? []) {
    if (e.termLabel?.trim()) set.add(e.termLabel.trim());
  }
  return Array.from(set).sort(compareOfficeTermLabels);
}

export function formatGradeDisplay(entry: Pick<OfficeGradeEntry, 'letterGrade' | 'numericGrade'>): string {
  const parts: string[] = [];
  const letter = safeString(entry.letterGrade);
  if (letter) parts.push(letter);
  const numeric = safeFiniteNumber(entry.numericGrade);
  if (numeric != null) parts.push(`${numeric}%`);
  return parts.length ? parts.join(' · ') : '—';
}

export function isInvoiceOpen(inv: OfficeInvoice): boolean {
  return inv.status === 'sent' || inv.status === 'draft' || inv.status === 'partial';
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

/** Distinct subjects with at least one grade in the term. */
export function gradeSubjectsForTerm(entries: OfficeGradeEntry[], termLabel: string): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    if (e.termLabel !== termLabel) continue;
    const s = e.subject?.trim();
    if (s) set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export type StudentSubjectGap = {
  student: OfficeStudent;
  missingSubjects: string[];
};

/** Per-subject completion when the term already has subject columns; otherwise same as any-grade check. */
export function studentsMissingSubjectsForTerm(
  students: OfficeStudent[],
  entries: OfficeGradeEntry[],
  termLabel: string,
  requiredSubjects?: string[],
): StudentSubjectGap[] {
  const subjects =
    requiredSubjects?.filter(Boolean) ?? gradeSubjectsForTerm(entries, termLabel);
  if (subjects.length === 0) {
    return studentsWithoutGradesForTerm(students, entries, termLabel).map((student) => ({
      student,
      missingSubjects: ['any grade'],
    }));
  }
  const byStudent = new Map<string, Set<string>>();
  for (const e of entries) {
    if (e.termLabel !== termLabel) continue;
    const sub = e.subject?.trim();
    if (!sub) continue;
    if (!byStudent.has(e.studentId)) byStudent.set(e.studentId, new Set());
    byStudent.get(e.studentId)!.add(sub);
  }
  const gaps: StudentSubjectGap[] = [];
  for (const student of students) {
    const have = byStudent.get(student.id) ?? new Set<string>();
    const missingSubjects = subjects.filter((sub) => !have.has(sub));
    if (missingSubjects.length > 0) gaps.push({ student, missingSubjects });
  }
  return gaps;
}

export type OverdueFamilyDigestRow = {
  accountId: string;
  familyName: string;
  contactEmail: string | null;
  invoiceCount: number;
  totalCents: number;
  oldestDueDate: string;
};

export function buildOverdueFamiliesDigest(
  accounts: OfficeBillingAccount[],
  invoices: OfficeInvoice[],
): OverdueFamilyDigestRow[] {
  const overdue = invoices.filter((i) => isInvoiceOverdue(i));
  const byAccount = new Map<string, OfficeInvoice[]>();
  for (const inv of overdue) {
    const list = byAccount.get(inv.accountId) ?? [];
    list.push(inv);
    byAccount.set(inv.accountId, list);
  }
  const rows: OverdueFamilyDigestRow[] = [];
  for (const [accountId, list] of byAccount) {
    const account = accounts.find((a) => a.id === accountId);
    rows.push({
      accountId,
      familyName: safeString(account?.familyName, 'Account'),
      contactEmail: safeString(account?.contactEmail) || null,
      invoiceCount: list.length,
      totalCents: list.reduce((sum, i) => sum + (safeFiniteNumber(i.amountCents) ?? 0), 0),
      oldestDueDate: list.map((i) => i.dueDate).sort()[0] ?? '',
    });
  }
  return rows.sort((a, b) => a.oldestDueDate.localeCompare(b.oldestDueDate));
}

export function buildOverdueFamiliesDigestMailto(
  rows: OverdueFamilyDigestRow[],
  schoolName?: string,
): string {
  const school = schoolName?.trim() || 'School Office';
  const lines = rows.map(
    (r) =>
      `${r.familyName}: ${r.invoiceCount} invoice(s), ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(r.totalCents / 100)} (oldest due ${r.oldestDueDate})`,
  );
  const subject = encodeURIComponent(`Overdue billing summary — ${school}`);
  const body = encodeURIComponent(
    `Overdue families (${rows.length}):\n\n${lines.join('\n')}\n\n— ${school}`,
  );
  return `mailto:?subject=${subject}&body=${body}`;
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
  /** Subjects tracked for per-subject completion (empty = any-grade mode). */
  termSubjects: string[];
  studentsFullyGraded: number;
  subjectGradeCompletionPct: number;
  studentsWithSubjectGaps: number;
  overdueFamilies: OverdueFamilyDigestRow[];
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
  const termSubjects = gradeSubjectsForTerm(gradeEntries, activeTerm);
  const subjectGaps = studentsMissingSubjectsForTerm(students, gradeEntries, activeTerm);
  const studentsWithSubjectGaps = subjectGaps.length;
  const studentsFullyGraded = students.length - studentsWithSubjectGaps;
  const subjectGradeCompletionPct =
    students.length > 0 ? Math.round((studentsFullyGraded / students.length) * 100) : 100;
  const missingGrades =
    termSubjects.length > 0 ? studentsWithSubjectGaps : studentsWithoutGradesForTerm(students, gradeEntries, activeTerm).length;
  const studentsGraded = students.length - missingGrades;
  const gradeCompletionPct =
    students.length > 0 ? Math.round((studentsGraded / students.length) * 100) : 100;
  const paidInvoiceCount = invoices.filter((i) => i.status === 'paid').length;
  const dueSoonCount = invoices.filter((i) => isInvoiceDueSoon(i)).length;
  const overdueFamilies = buildOverdueFamiliesDigest(billingAccounts, invoices);

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
    termSubjects,
    studentsFullyGraded,
    subjectGradeCompletionPct,
    studentsWithSubjectGaps,
    overdueFamilies,
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
  const dollars = safeFiniteNumber(amount);
  if (dollars == null || dollars < 0) return null;
  return Math.round(dollars * 100);
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
  teacherNameById: Map<string, string>,
): void {
  const rows = students.map((s) => [
    safeString(s.firstName),
    safeString(s.lastName),
    safeString(s.nickname),
    safeString(s.classId ? classNameById.get(s.classId) : undefined),
    getOfficeTeacherLabel(s, teacherNameById),
    safeString(s.notes),
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
