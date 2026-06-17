import { getOfficeStudentFullName, getOfficeTeacherLabel } from '@/lib/office/officeUtils';
import { safeString } from '@/lib/safeDisplayValue';
import type {
  OfficeBillingAccount,
  OfficeClass,
  OfficeFamily,
  OfficeGradeEntry,
  OfficeInvoice,
  OfficeStudent,
  OfficeTeacher,
} from '@/lib/office/types';

export type OfficeSearchResultKind =
  | 'student'
  | 'family'
  | 'class'
  | 'teacher'
  | 'billing'
  | 'invoice'
  | 'mark';

export type OfficeSearchResult = {
  id: string;
  kind: OfficeSearchResultKind;
  title: string;
  subtitle: string;
  hrefSegment: 'students' | 'classes' | 'teachers' | 'billing' | 'grades' | 'reports';
  queryParam?: string;
  haystack: string;
};

function hay(...parts: unknown[]): string {
  return parts.map((p) => safeString(p).toLowerCase()).filter(Boolean).join(' ');
}

export function buildOfficeSearchIndex(params: {
  students: OfficeStudent[];
  families: OfficeFamily[];
  classes: OfficeClass[];
  teachers: OfficeTeacher[];
  billingAccounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
  gradeEntries: OfficeGradeEntry[];
  classNameById: Map<string, string>;
  teacherNameById: Map<string, string>;
  studentLabelById: Map<string, string>;
}): OfficeSearchResult[] {
  const results: OfficeSearchResult[] = [];

  for (const s of params.students) {
    const title = getOfficeStudentFullName(s);
    const className = s.classId ? params.classNameById.get(s.classId) : '';
    const teacher = getOfficeTeacherLabel(s, params.teacherNameById);
    const subtitle = [className, teacher, safeString(s.busRoute), safeString(s.notes)].filter(Boolean).join(' · ');
    results.push({
      id: `student-${s.id}`,
      kind: 'student',
      title,
      subtitle: subtitle || 'Student',
      hrefSegment: 'students',
      queryParam: `student=${encodeURIComponent(s.id)}`,
      haystack: hay(title, className, teacher, s.nickname, s.firstName, s.lastName, s.notes, s.busRoute),
    });
  }

  for (const f of params.families) {
    const contactBits = (f.contacts ?? []).flatMap((c) => [c.name, c.phone, c.email, c.relationship, c.notes]);
    results.push({
      id: `family-${f.id}`,
      kind: 'family',
      title: safeString(f.displayName, 'Family'),
      subtitle: [safeString(f.busRoute), safeString(f.generalNotes)].filter(Boolean).join(' · ') || 'Family profile',
      hrefSegment: 'students',
      queryParam: `family=${encodeURIComponent(f.id)}`,
      haystack: hay(
        f.displayName,
        f.medicalNotes,
        f.legalNotes,
        f.busRoute,
        f.busNotes,
        f.generalNotes,
        ...contactBits,
      ),
    });
  }

  for (const c of params.classes) {
    const teacherName = c.teacherId ? params.teacherNameById.get(c.teacherId) : '';
    results.push({
      id: `class-${c.id}`,
      kind: 'class',
      title: safeString(c.name, 'Class'),
      subtitle: teacherName ? `Teacher: ${teacherName}` : 'Class',
      hrefSegment: 'classes',
      haystack: hay(c.name, teacherName),
    });
  }

  for (const t of params.teachers) {
    results.push({
      id: `teacher-${t.id}`,
      kind: 'teacher',
      title: safeString(t.name, 'Teacher'),
      subtitle: safeString(t.email) || 'Teacher',
      hrefSegment: 'teachers',
      haystack: hay(t.name, t.email),
    });
  }

  for (const a of params.billingAccounts) {
    const linked = a.studentIds
      .map((id) => params.studentLabelById.get(id))
      .filter(Boolean)
      .join(', ');
    results.push({
      id: `billing-${a.id}`,
      kind: 'billing',
      title: safeString(a.familyName, 'Billing account'),
      subtitle: linked || safeString(a.contactEmail) || 'Billing',
      hrefSegment: 'billing',
      queryParam: `account=${encodeURIComponent(a.id)}`,
      haystack: hay(a.familyName, a.contactEmail, a.contactPhone, a.notes, linked),
    });
  }

  for (const inv of params.invoices) {
    results.push({
      id: `invoice-${inv.id}`,
      kind: 'invoice',
      title: safeString(inv.label, 'Invoice'),
      subtitle: `${inv.status} · due ${safeString(inv.dueDate)}`,
      hrefSegment: 'billing',
      queryParam: `invoice=${encodeURIComponent(inv.id)}`,
      haystack: hay(inv.label, inv.status, inv.dueDate, inv.paymentNote),
    });
  }

  for (const e of params.gradeEntries) {
    const student = params.studentLabelById.get(e.studentId) ?? e.studentId;
    results.push({
      id: `mark-${e.id}`,
      kind: 'mark',
      title: `${student} — ${safeString(e.subject)}`,
      subtitle: [safeString(e.termLabel), safeString(e.letterGrade), e.numericGrade].filter(Boolean).join(' · '),
      hrefSegment: 'grades',
      haystack: hay(student, e.subject, e.termLabel, e.letterGrade, e.notes, e.numericGrade),
    });
  }

  return results;
}

export function filterOfficeSearchIndex(index: OfficeSearchResult[], query: string, limit = 24): OfficeSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return index.slice(0, limit);
  return index.filter((row) => row.haystack.includes(q) || row.title.toLowerCase().includes(q)).slice(0, limit);
}
