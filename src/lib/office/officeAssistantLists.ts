import { officeAddressMatches } from '@/lib/office/officeAddress';
import { formatCents } from '@/lib/office/officeNav';
import { formatScheduleTime } from '@/lib/office/officeSchedule';
import { invoiceBalanceDueCents } from '@/lib/office/officeBillingPayments';
import {
  billingAccountForStudent,
  getOfficeStudentFullName,
  getTeacherIds,
  isInvoiceDueSoon,
  isInvoiceOverdue,
  officeStudentHasTeacher,
} from '@/lib/office/officeUtils';
import type { OfficeAssistantAttendanceStatus } from '@/lib/office/officeAssistantView';
import { OFFICE_ASSISTANT_CHAT_ROWS, type OfficeAssistantReport } from '@/lib/office/officeAssistantResults';
import type {
  OfficeAttendanceEntry,
  OfficeAttendanceStatus,
  OfficeBillingAccount,
  OfficeDeskLogEntry,
  OfficeDeskLogKind,
  OfficeFamily,
  OfficeInvoice,
  OfficeStudent,
} from '@/lib/office/types';

/**
 * Which records a "show me" list holds, for each page that can show one. The page and the
 * assistant's answer both use these, so the names in the answer are the ones on the page.
 */

type ListReport = OfficeAssistantReport;

// Students

export type OfficeRosterFilter =
  | 'all'
  | 'missing-grades'
  | 'no-billing'
  | 'unassigned'
  | 'no-teacher'
  | 'no-family'
  | 'allergies'
  | 'withdrawn'
  | 'graduated';

export type OfficeStudentListFilters = {
  rosterFilter: OfficeRosterFilter;
  /** A class id, 'all', or '__unassigned__'. */
  classFilter: string;
  /** A teacher id or 'all'. */
  homeroomFilter: string;
  query: string;
  teacherText: string;
  addressText: string;
  lastStarts: string;
  firstStarts: string;
  birthMonth: number | null;
  idsFilter: Set<string> | null;
};

export type OfficeStudentListData = {
  classNameById: Map<string, string>;
  teacherNameById: Map<string, string>;
  gradedForTerm: Set<string>;
  billingAccounts: OfficeBillingAccount[];
  familyById: Map<string, OfficeFamily>;
};

/** The students matching the filters, in no particular order. */
export function filterOfficeStudents(
  students: OfficeStudent[],
  f: OfficeStudentListFilters,
  data: OfficeStudentListData,
): OfficeStudent[] {
  const q = f.query.trim().toLowerCase();
  const teacherQ = f.teacherText.trim().toLowerCase();
  const teacherIds = teacherQ
    ? new Set([...data.teacherNameById.entries()].filter(([, name]) => name.toLowerCase().includes(teacherQ)).map(([id]) => id))
    : null;
  // The default roster is active students; withdrawn and graduated have their own filters.
  const base =
    f.rosterFilter === 'withdrawn'
      ? students.filter((s) => s.status === 'withdrawn')
      : f.rosterFilter === 'graduated'
        ? students.filter((s) => s.status === 'graduated')
        : students.filter((s) => (s.status ?? 'active') === 'active');
  return base.filter((s) => {
    if (f.homeroomFilter !== 'all' && !getTeacherIds(s).includes(f.homeroomFilter)) return false;
    if (f.rosterFilter === 'unassigned' && s.classId) return false;
    if (f.rosterFilter === 'no-teacher' && officeStudentHasTeacher(s)) return false;
    if (f.rosterFilter === 'missing-grades' && data.gradedForTerm.has(s.id)) return false;
    if (f.rosterFilter === 'no-billing' && billingAccountForStudent(data.billingAccounts, s.id)) return false;
    if (f.rosterFilter === 'no-family' && s.familyId) return false;
    if (f.rosterFilter === 'allergies' && !s.allergies?.trim()) return false;
    if (teacherIds && !getTeacherIds(s).some((id) => teacherIds.has(id))) return false;
    if (f.addressText.trim()) {
      const address = s.familyId ? data.familyById.get(s.familyId)?.homeAddress : null;
      if (!officeAddressMatches(address, f.addressText)) return false;
    }
    if (f.lastStarts && !(s.lastName ?? '').trim().toLowerCase().startsWith(f.lastStarts.toLowerCase())) return false;
    if (f.firstStarts && !(s.firstName ?? '').trim().toLowerCase().startsWith(f.firstStarts.toLowerCase())) return false;
    if (f.birthMonth && Number(s.dateOfBirth?.slice(5, 7)) !== f.birthMonth) return false;
    if (f.idsFilter && !f.idsFilter.has(s.id)) return false;
    if (f.classFilter === '__unassigned__' && s.classId) return false;
    if (f.classFilter !== 'all' && f.classFilter !== '__unassigned__' && s.classId !== f.classFilter) return false;
    if (!q) return true;
    const label = getOfficeStudentFullName(s).toLowerCase();
    const cls = (s.classId && data.classNameById.get(s.classId))?.toLowerCase() ?? '';
    return label.includes(q) || cls.includes(q);
  });
}

/** `students` already sorted the way the page shows them. */
export function officeStudentsListReport(
  students: OfficeStudent[],
  classNameById: Map<string, string>,
  birthMonth: number | null,
): ListReport {
  return {
    status: 'ready',
    total: students.length,
    noun: ['student', 'students'],
    studentIds: students.map((s) => s.id),
    rows: students.slice(0, OFFICE_ASSISTANT_CHAT_ROWS).map((s) => ({
      id: s.id,
      name: getOfficeStudentFullName(s),
      detail:
        [
          (s.classId && classNameById.get(s.classId)) || null,
          // For a birthday list, show the day too.
          birthMonth && s.dateOfBirth
            ? `birthday ${new Date(`${s.dateOfBirth}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
      open: { kind: 'student', id: s.id },
    })),
  };
}

// Billing

export type OfficeInvoiceFilter = 'all' | 'open' | 'overdue' | 'due-soon';

export type OfficeBillingListFilters = {
  search: string;
  minOwedCents: number | null;
  maxOwedCents: number | null;
  invoiceFilter: OfficeInvoiceFilter;
};

export function officeOwedByAccount(invoices: OfficeInvoice[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const inv of invoices) map.set(inv.accountId, (map.get(inv.accountId) ?? 0) + invoiceBalanceDueCents(inv));
  return map;
}

/** Each family's bills, latest due date first (the order the Billing page lists them in). */
export function officeInvoicesByAccount(invoices: OfficeInvoice[]): Map<string, OfficeInvoice[]> {
  const map = new Map<string, OfficeInvoice[]>();
  for (const inv of invoices) {
    const list = map.get(inv.accountId) ?? [];
    list.push(inv);
    map.set(inv.accountId, list);
  }
  for (const list of map.values()) list.sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''));
  return map;
}

export function filterOfficeBillingAccounts(
  accounts: OfficeBillingAccount[],
  f: OfficeBillingListFilters,
  data: {
    owedByAccount: Map<string, number>;
    invoicesByAccount: Map<string, OfficeInvoice[]>;
    studentLabelById: Map<string, string>;
  },
): OfficeBillingAccount[] {
  const q = f.search.trim().toLowerCase();
  let list = accounts;
  if (f.minOwedCents != null) list = list.filter((a) => (data.owedByAccount.get(a.id) ?? 0) > f.minOwedCents!);
  if (f.maxOwedCents != null) list = list.filter((a) => (data.owedByAccount.get(a.id) ?? 0) < f.maxOwedCents!);
  if (f.invoiceFilter === 'overdue') {
    list = list.filter((a) => (data.invoicesByAccount.get(a.id) ?? []).some((i) => isInvoiceOverdue(i)));
  } else if (f.invoiceFilter === 'due-soon') {
    list = list.filter((a) => (data.invoicesByAccount.get(a.id) ?? []).some((i) => isInvoiceDueSoon(i)));
  } else if (f.invoiceFilter === 'open') {
    list = list.filter(
      (a) =>
        (a.balanceCents || 0) > 0 ||
        (data.invoicesByAccount.get(a.id) ?? []).some(
          (i) => i.status === 'sent' || i.status === 'partial' || i.status === 'draft',
        ),
    );
  }
  if (!q) return list;
  return list.filter((a) => {
    const linked = (a.studentIds ?? []).map((id) => data.studentLabelById.get(id) ?? '').join(' ');
    return (a.familyName ?? '').toLowerCase().includes(q) || linked.toLowerCase().includes(q);
  });
}

/** Largest balance first. */
export function officeBillingListReport(accounts: OfficeBillingAccount[], owedByAccount: Map<string, number>): ListReport {
  return {
    status: 'ready',
    total: accounts.length,
    noun: ['family', 'families'],
    studentIds: [...new Set(accounts.flatMap((a) => a.studentIds ?? []))],
    rows: accounts
      .map((a) => ({ a, owed: owedByAccount.get(a.id) ?? 0 }))
      .sort((x, y) => y.owed - x.owed)
      .slice(0, OFFICE_ASSISTANT_CHAT_ROWS)
      .map(({ a, owed }) => ({
        id: a.id,
        name: a.familyName?.trim() || 'Family',
        detail: owed > 0 ? `owes ${formatCents(owed)}` : 'nothing owed',
        open: a.familyId
          ? { kind: 'family' as const, id: a.familyId }
          : a.studentIds?.[0]
            ? { kind: 'student' as const, id: a.studentIds[0] }
            : undefined,
      })),
  };
}

// Attendance

const ATTENDANCE_STATUS_LABEL: Record<OfficeAttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
};

export const OFFICE_ATTENDANCE_UNAVAILABLE = 'Attendance isn’t open yet — it opens after the next update.';

export type OfficeAttendanceMatch = { entry: OfficeAttendanceEntry; name: string; className: string };

export function officeAttendanceMatches(
  dayEntries: OfficeAttendanceEntry[],
  status: OfficeAssistantAttendanceStatus,
  classId: string | null,
  students: OfficeStudent[],
  classNameById: Map<string, string>,
): OfficeAttendanceMatch[] {
  const studentById = new Map(students.map((s) => [s.id, s]));
  return dayEntries
    .filter((e) => (status === 'not-present' ? e.status !== 'present' : e.status === status))
    .filter((e) => !classId || e.classId === classId)
    .map((e) => {
      const s = studentById.get(e.studentId);
      return { entry: e, name: s ? getOfficeStudentFullName(s) : 'Student', className: classNameById.get(e.classId) ?? '' };
    })
    .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));
}

export function officeAttendanceListReport(matches: OfficeAttendanceMatch[], status: OfficeAssistantAttendanceStatus): ListReport {
  return {
    status: 'ready',
    total: matches.length,
    noun: ['student', 'students'],
    studentIds: [...new Set(matches.map((m) => m.entry.studentId))],
    rows: matches.slice(0, OFFICE_ASSISTANT_CHAT_ROWS).map((m) => ({
      id: m.entry.id,
      name: m.name,
      open: { kind: 'student', id: m.entry.studentId },
      detail: [m.className, status === 'not-present' ? ATTENDANCE_STATUS_LABEL[m.entry.status] : null]
        .filter(Boolean)
        .join(' · '),
    })),
  };
}

// Front desk

export type OfficeDeskTab = 'arrivals' | 'nurse';

export const OFFICE_DESK_KIND_LABEL: Record<OfficeDeskLogKind, string> = {
  late_arrival: 'Late arrival',
  early_pickup: 'Early pickup',
  nurse_visit: 'Nurse visit',
};

export const OFFICE_DESK_UNAVAILABLE = 'The front desk log isn’t open yet — it opens after the next update.';

export function officeDeskShown(entries: OfficeDeskLogEntry[], tab: OfficeDeskTab, kind: OfficeDeskLogKind | null) {
  return entries
    .filter((e) => (tab === 'arrivals' ? e.kind !== 'nurse_visit' : e.kind === 'nurse_visit'))
    .filter((e) => !kind || e.kind === kind);
}

export function officeDeskListReport(shown: OfficeDeskLogEntry[], nameOf: (studentId: string) => string): ListReport {
  return {
    status: 'ready',
    total: shown.length,
    noun: ['entry', 'entries'],
    studentIds: [...new Set(shown.map((e) => e.studentId))],
    rows: shown.slice(0, OFFICE_ASSISTANT_CHAT_ROWS).map((e) => ({
      id: e.id,
      name: nameOf(e.studentId),
      detail: `${OFFICE_DESK_KIND_LABEL[e.kind]}, ${formatScheduleTime(e.time)}${e.reason ? ` · ${e.reason}` : ''}`,
      open: { kind: 'student', id: e.studentId },
    })),
  };
}
