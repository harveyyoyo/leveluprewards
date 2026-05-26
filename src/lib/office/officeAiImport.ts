import {
  collection,
  doc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { addStaffAccount } from '@/lib/db/staffAccounts';
import { saveOfficeSettings } from '@/lib/office/officeSettingsDoc';
import type {
  OfficeBillingAccount,
  OfficeClass,
  OfficeGradeEntry,
  OfficeInvoice,
  OfficeStudent,
  OfficeTeacher,
} from '@/lib/office/types';
import {
  getOfficeStudentFullName,
  parseUsdToCents,
  resolveOfficeTeacherIdByName,
} from '@/lib/office/officeUtils';

export type ParsedOfficeStudentRow = {
  firstName: string;
  lastName: string;
  nickname?: string;
  className?: string;
  teacherName?: string;
  notes?: string;
};

export type ParsedOfficeGradeRow = {
  studentName: string;
  termLabel: string;
  subject: string;
  letterGrade?: string | null;
  numericGrade?: number | null;
  notes?: string | null;
};

export type ParsedOfficeBillingAccountRow = {
  familyName: string;
  studentNames?: string[];
  contactEmail?: string | null;
  contactPhone?: string | null;
  balanceCents?: number;
  notes?: string | null;
};

export type ParsedOfficeInvoiceRow = {
  familyName: string;
  label: string;
  amountCents: number;
  dueDate?: string;
  status?: 'draft' | 'sent' | 'paid' | 'void';
};

export type ParsedOfficeStaffRow = {
  displayName: string;
  username: string;
  passcode: string;
};

export type ParsedOfficeTeacherRow = {
  name: string;
  email?: string | null;
};

export type ParsedOfficeSnapshot = {
  teachers?: ParsedOfficeTeacherRow[];
  classes?: { name: string }[];
  students?: ParsedOfficeStudentRow[];
  grades?: ParsedOfficeGradeRow[];
  billingAccounts?: ParsedOfficeBillingAccountRow[];
  invoices?: ParsedOfficeInvoiceRow[];
  staffAccounts?: ParsedOfficeStaffRow[];
  defaultActiveTerm?: string;
  statementSchoolName?: string;
};

export type OfficeAiImportReport = {
  teachersAdded: number;
  classesAdded: number;
  studentsAdded: number;
  studentsUpdated: number;
  gradesAdded: number;
  gradesSkipped: number;
  billingAccountsAdded: number;
  invoicesAdded: number;
  staffAdded: number;
  settingsUpdated: boolean;
  errors: string[];
};

export function officeSnapshotCounts(snapshot: ParsedOfficeSnapshot): Record<string, number> {
  const o: Record<string, number> = {};
  if (snapshot.classes?.length) o.classes = snapshot.classes.length;
  if (snapshot.students?.length) o.students = snapshot.students.length;
  if (snapshot.grades?.length) o.grades = snapshot.grades.length;
  if (snapshot.billingAccounts?.length) o.billingAccounts = snapshot.billingAccounts.length;
  if (snapshot.invoices?.length) o.invoices = snapshot.invoices.length;
  if (snapshot.staffAccounts?.length) o.staffAccounts = snapshot.staffAccounts.length;
  if (snapshot.defaultActiveTerm?.trim()) o.settings = 1;
  if (snapshot.statementSchoolName?.trim()) o.settings = (o.settings ?? 0) + 1;
  return o;
}

export function totalOfficeSnapshotItems(snapshot: ParsedOfficeSnapshot): number {
  return Object.values(officeSnapshotCounts(snapshot)).reduce((a, b) => a + b, 0);
}

function unwrapArray(parsed: unknown, keys: string[]): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    for (const k of keys) {
      const v = (parsed as Record<string, unknown>)[k];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function parseStudentName(row: Record<string, unknown>): { firstName: string; lastName: string; studentName: string } | null {
  let firstName = typeof row.firstName === 'string' ? row.firstName.trim() : '';
  let lastName = typeof row.lastName === 'string' ? row.lastName.trim() : '';
  if (!firstName && !lastName) {
    const full =
      (typeof row.studentName === 'string' && row.studentName.trim()) ||
      (typeof row.name === 'string' && row.name.trim()) ||
      (typeof row.fullName === 'string' && row.fullName.trim()) ||
      '';
    if (full) {
      const parts = full.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
  }
  if (!firstName && !lastName) return null;
  const studentName = `${firstName} ${lastName}`.trim();
  return {
    firstName: firstName || '—',
    lastName: lastName || '—',
    studentName,
  };
}

function parseNumericGrade(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = raw <= 1 && raw > 0 ? raw * 100 : raw;
    if (n >= 0 && n <= 100) return Math.round(n * 10) / 10;
  }
  if (typeof raw === 'string') {
    const s = raw.trim().replace('%', '');
    const n = Number(s);
    if (Number.isFinite(n) && n >= 0 && n <= 100) return Math.round(n * 10) / 10;
  }
  return null;
}

function parseAmountCents(row: Record<string, unknown>): number | null {
  if (typeof row.amountCents === 'number' && Number.isFinite(row.amountCents)) {
    return Math.max(0, Math.round(row.amountCents));
  }
  const dollars =
    (typeof row.amount === 'number' && String(row.amount)) ||
    (typeof row.amountUsd === 'string' && row.amountUsd) ||
    (typeof row.amount === 'string' && row.amount) ||
    (typeof row.total === 'string' && row.total) ||
    '';
  if (dollars) {
    const cleaned = String(dollars).replace(/[$,]/g, '').trim();
    return parseUsdToCents(cleaned);
  }
  return null;
}

function normalizeInvoiceStatus(raw: unknown): ParsedOfficeInvoiceRow['status'] | undefined {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('paid')) return 'paid';
  if (s.includes('void')) return 'void';
  if (s.includes('draft')) return 'draft';
  if (s.includes('sent') || s.includes('open')) return 'sent';
  return undefined;
}

export function normalizeOfficeAiSnapshot(parsed: Record<string, unknown>): ParsedOfficeSnapshot {
  const teachersRaw = unwrapArray(parsed, ['teachers', 'officeTeachers', 'homeroomTeachers', 'classroomTeachers']);
  const teachers: ParsedOfficeTeacherRow[] = [];
  for (const row of teachersRaw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const name =
      (typeof o.name === 'string' && o.name.trim()) ||
      (typeof o.teacherName === 'string' && o.teacherName.trim()) ||
      '';
    if (!name) continue;
    teachers.push({
      name,
      email: (typeof o.email === 'string' && o.email.trim()) || null,
    });
  }

  const classesRaw = unwrapArray(parsed, ['classes', 'officeClasses', 'classGroups']);
  const classes = classesRaw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const name = String(o.name ?? o.className ?? o.title ?? '').trim();
      return name ? { name } : null;
    })
    .filter(Boolean) as { name: string }[];

  const studentsRaw = unwrapArray(parsed, ['students', 'officeStudents', 'roster', 'pupils']);
  const students: ParsedOfficeStudentRow[] = [];
  for (const row of studentsRaw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const name = parseStudentName(o);
    if (!name) continue;
    const className =
      (typeof o.className === 'string' && o.className.trim()) ||
      (typeof o.homeroom === 'string' && o.homeroom.trim()) ||
      (typeof o.class === 'string' && o.class.trim()) ||
      undefined;
    students.push({
      firstName: name.firstName,
      lastName: name.lastName,
      nickname:
        (typeof o.nickname === 'string' && o.nickname.trim()) ||
        (typeof o.preferredName === 'string' && o.preferredName.trim()) ||
        undefined,
      className,
      teacherName:
        (typeof o.teacherName === 'string' && o.teacherName.trim()) ||
        (typeof o.teacher === 'string' && o.teacher.trim()) ||
        undefined,
      notes: (typeof o.notes === 'string' && o.notes.trim()) || undefined,
    });
  }

  const gradesRaw = unwrapArray(parsed, ['grades', 'gradeEntries', 'officeGrades', 'reportCards']);
  const grades: ParsedOfficeGradeRow[] = [];
  for (const row of gradesRaw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const name = parseStudentName(o);
    const termLabel =
      (typeof o.termLabel === 'string' && o.termLabel.trim()) ||
      (typeof o.term === 'string' && o.term.trim()) ||
      '';
    const subject =
      (typeof o.subject === 'string' && o.subject.trim()) ||
      (typeof o.course === 'string' && o.course.trim()) ||
      '';
    if (!name || !termLabel || !subject) continue;
    grades.push({
      studentName: name.studentName,
      termLabel,
      subject,
      letterGrade:
        (typeof o.letterGrade === 'string' && o.letterGrade.trim()) ||
        (typeof o.letter === 'string' && o.letter.trim()) ||
        (typeof o.grade === 'string' && o.grade.trim()) ||
        null,
      numericGrade: parseNumericGrade(o.numericGrade ?? o.percent ?? o.percentage),
      notes: (typeof o.notes === 'string' && o.notes.trim()) || null,
    });
  }

  const billingRaw = unwrapArray(parsed, ['billingAccounts', 'billing', 'families', 'accounts']);
  const billingAccounts: ParsedOfficeBillingAccountRow[] = [];
  for (const row of billingRaw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const familyName =
      (typeof o.familyName === 'string' && o.familyName.trim()) ||
      (typeof o.family === 'string' && o.family.trim()) ||
      (typeof o.accountName === 'string' && o.accountName.trim()) ||
      '';
    if (!familyName) continue;
    let studentNames: string[] | undefined;
    if (Array.isArray(o.studentNames)) {
      studentNames = o.studentNames
        .filter((n): n is string => typeof n === 'string' && Boolean(n.trim()))
        .map((n) => n.trim());
    } else if (typeof o.students === 'string' && o.students.trim()) {
      studentNames = o.students.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    }
    billingAccounts.push({
      familyName,
      studentNames,
      contactEmail: (typeof o.contactEmail === 'string' && o.contactEmail.trim()) || null,
      contactPhone: (typeof o.contactPhone === 'string' && o.contactPhone.trim()) || null,
      balanceCents:
        typeof o.balanceCents === 'number'
          ? Math.max(0, Math.round(o.balanceCents))
          : parseAmountCents({ amount: o.balance, amountUsd: o.balanceUsd }) ?? undefined,
      notes: (typeof o.notes === 'string' && o.notes.trim()) || null,
    });
  }

  const invoicesRaw = unwrapArray(parsed, ['invoices', 'bills', 'charges']);
  const invoices: ParsedOfficeInvoiceRow[] = [];
  for (const row of invoicesRaw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const familyName =
      (typeof o.familyName === 'string' && o.familyName.trim()) ||
      (typeof o.family === 'string' && o.family.trim()) ||
      '';
    const label =
      (typeof o.label === 'string' && o.label.trim()) ||
      (typeof o.description === 'string' && o.description.trim()) ||
      '';
    const amountCents = parseAmountCents(o);
    if (!familyName || !label || amountCents == null) continue;
    invoices.push({
      familyName,
      label,
      amountCents,
      dueDate:
        (typeof o.dueDate === 'string' && o.dueDate.trim().slice(0, 10)) ||
        (typeof o.due === 'string' && o.due.trim().slice(0, 10)) ||
        undefined,
      status: normalizeInvoiceStatus(o.status),
    });
  }

  const staffRaw = unwrapArray(parsed, ['staffAccounts', 'officeStaff', 'deskStaff']);
  const staffAccounts: ParsedOfficeStaffRow[] = [];
  for (const row of staffRaw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const displayName =
      (typeof o.displayName === 'string' && o.displayName.trim()) ||
      (typeof o.name === 'string' && o.name.trim()) ||
      '';
    const username = typeof o.username === 'string' ? o.username.trim() : '';
    const passcode =
      (typeof o.passcode === 'string' && o.passcode.trim()) ||
      (typeof o.password === 'string' && o.password.trim()) ||
      (typeof o.pin === 'string' && o.pin.trim()) ||
      '';
    if (!displayName || !username || !passcode) continue;
    staffAccounts.push({ displayName, username, passcode });
  }

  const snap: ParsedOfficeSnapshot = {};
  if (teachers.length) snap.teachers = teachers;
  if (classes.length) snap.classes = classes;
  if (students.length) snap.students = students;
  if (grades.length) snap.grades = grades;
  if (billingAccounts.length) snap.billingAccounts = billingAccounts;
  if (invoices.length) snap.invoices = invoices;
  if (staffAccounts.length) snap.staffAccounts = staffAccounts;
  const defaultActiveTerm =
    (typeof parsed.defaultActiveTerm === 'string' && parsed.defaultActiveTerm.trim()) ||
    (typeof parsed.defaultTerm === 'string' && parsed.defaultTerm.trim()) ||
    '';
  if (defaultActiveTerm) snap.defaultActiveTerm = defaultActiveTerm;
  const statementSchoolName =
    (typeof parsed.statementSchoolName === 'string' && parsed.statementSchoolName.trim()) ||
    (typeof parsed.schoolName === 'string' && parsed.schoolName.trim()) ||
    '';
  if (statementSchoolName) snap.statementSchoolName = statementSchoolName;
  return snap;
}

const BATCH_SIZE = 400;

async function commitBatches(firestore: Firestore, ops: Array<(batch: ReturnType<typeof writeBatch>) => void>) {
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(firestore);
    for (const op of ops.slice(i, i + BATCH_SIZE)) op(batch);
    await batch.commit();
  }
}

export async function applyOfficeAiSnapshot(
  firestore: Firestore,
  schoolId: string,
  snapshot: ParsedOfficeSnapshot,
  ctx: {
    classes: OfficeClass[];
    teachers: OfficeTeacher[];
    students: OfficeStudent[];
    gradeEntries: OfficeGradeEntry[];
    billingAccounts: OfficeBillingAccount[];
    upsertStudents?: boolean;
    updatedBy?: string | null;
    canImportStaff?: boolean;
  },
): Promise<OfficeAiImportReport> {
  const report: OfficeAiImportReport = {
    teachersAdded: 0,
    classesAdded: 0,
    studentsAdded: 0,
    studentsUpdated: 0,
    gradesAdded: 0,
    gradesSkipped: 0,
    billingAccountsAdded: 0,
    invoicesAdded: 0,
    staffAdded: 0,
    settingsUpdated: false,
    errors: [],
  };

  const classIdByName = new Map(ctx.classes.map((c) => [c.name.trim().toLowerCase(), c.id]));
  const studentIdByName = new Map(
    ctx.students.map((s) => [getOfficeStudentFullName(s).toLowerCase(), s.id]),
  );
  const studentById = new Map(ctx.students.map((s) => [s.id, s]));
  const accountIdByFamily = new Map(
    ctx.billingAccounts.map((a) => [a.familyName.trim().toLowerCase(), a.id]),
  );

  const gradeKeys = new Set(
    ctx.gradeEntries.map((e) => `${e.studentId}|${e.termLabel}|${e.subject.toLowerCase()}`),
  );

  const classOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  for (const c of snapshot.classes ?? []) {
    const key = c.name.trim().toLowerCase();
    if (!key || classIdByName.has(key)) continue;
    const ref = doc(collection(firestore, 'schools', schoolId, 'officeClasses'));
    classIdByName.set(key, ref.id);
    classOps.push((batch) =>
      batch.set(ref, { name: c.name.trim(), updatedAt: Date.now() }),
    );
    report.classesAdded += 1;
  }
  await commitBatches(firestore, classOps);

  const teacherRoster: OfficeTeacher[] = [...ctx.teachers];
  const teacherIdByName = new Map(
    teacherRoster.map((t) => [t.name.trim().toLowerCase(), t.id]),
  );
  const teacherOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  for (const row of snapshot.teachers ?? []) {
    const key = row.name.trim().toLowerCase();
    if (!key || teacherIdByName.has(key)) continue;
    const ref = doc(collection(firestore, 'schools', schoolId, 'officeTeachers'));
    teacherIdByName.set(key, ref.id);
    teacherRoster.push({
      id: ref.id,
      name: row.name.trim(),
      email: row.email ?? null,
      updatedAt: Date.now(),
    });
    teacherOps.push((batch) =>
      batch.set(ref, {
        name: row.name.trim(),
        email: row.email ?? null,
        updatedAt: Date.now(),
      }),
    );
    report.teachersAdded += 1;
  }
  await commitBatches(firestore, teacherOps);

  const studentOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  for (const row of snapshot.students ?? []) {
    const key = getOfficeStudentFullName({
      firstName: row.firstName,
      lastName: row.lastName,
      nickname: row.nickname ?? null,
    }).toLowerCase();
    const classId = row.className ? classIdByName.get(row.className.trim().toLowerCase()) ?? null : null;
    const teacherId = resolveOfficeTeacherIdByName(teacherRoster, row.teacherName);
    const existingId = studentIdByName.get(key);
    if (existingId && ctx.upsertStudents) {
      const existing = studentById.get(existingId);
      if (existing) {
        const ref = doc(firestore, 'schools', schoolId, 'officeStudents', existingId);
        const patch: Partial<OfficeStudent> = { updatedAt: Date.now() };
        if (!existing.nickname?.trim() && row.nickname) patch.nickname = row.nickname;
        if (!existing.classId && classId) patch.classId = classId;
        if (!existing.teacherId?.trim() && teacherId) patch.teacherId = teacherId;
        else if (!existing.teacherId?.trim() && !existing.teacherName?.trim() && row.teacherName) {
          patch.teacherName = row.teacherName;
        }
        if (!existing.notes?.trim() && row.notes) patch.notes = row.notes;
        if (Object.keys(patch).length > 1) {
          studentOps.push((batch) => batch.update(ref, patch));
          report.studentsUpdated += 1;
        }
      }
      continue;
    }
    if (existingId) continue;
    const ref = doc(collection(firestore, 'schools', schoolId, 'officeStudents'));
    studentIdByName.set(key, ref.id);
    studentById.set(ref.id, {
      id: ref.id,
      firstName: row.firstName,
      lastName: row.lastName,
      nickname: row.nickname ?? null,
      classId,
      teacherId: teacherId ?? null,
      teacherName: teacherId ? null : row.teacherName ?? null,
      notes: row.notes ?? null,
      updatedAt: Date.now(),
    });
    studentOps.push((batch) =>
      batch.set(ref, {
        firstName: row.firstName,
        lastName: row.lastName,
        nickname: row.nickname ?? null,
        classId,
        teacherId: teacherId ?? null,
        teacherName: teacherId ? null : row.teacherName ?? null,
        notes: row.notes ?? null,
        updatedAt: Date.now(),
      }),
    );
    report.studentsAdded += 1;
  }
  await commitBatches(firestore, studentOps);

  const gradeOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  for (const row of snapshot.grades ?? []) {
    const studentId = studentIdByName.get(row.studentName.toLowerCase());
    if (!studentId) {
      report.gradesSkipped += 1;
      continue;
    }
    const dedupeKey = `${studentId}|${row.termLabel}|${row.subject.toLowerCase()}`;
    if (gradeKeys.has(dedupeKey)) {
      report.gradesSkipped += 1;
      continue;
    }
    gradeKeys.add(dedupeKey);
    const student = studentById.get(studentId);
    const ref = doc(collection(firestore, 'schools', schoolId, 'officeGradeEntries'));
    gradeOps.push((batch) =>
      batch.set(ref, {
        studentId,
        classId: student?.classId ?? null,
        termLabel: row.termLabel,
        subject: row.subject,
        letterGrade: row.letterGrade ?? null,
        numericGrade: row.numericGrade ?? null,
        notes: row.notes ?? null,
        updatedAt: Date.now(),
        updatedBy: ctx.updatedBy ?? null,
      }),
    );
    report.gradesAdded += 1;
  }
  await commitBatches(firestore, gradeOps);

  const billingOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  for (const row of snapshot.billingAccounts ?? []) {
    const key = row.familyName.trim().toLowerCase();
    if (!key || accountIdByFamily.has(key)) continue;
    const studentIds: string[] = [];
    for (const name of row.studentNames ?? []) {
      const sid = studentIdByName.get(name.toLowerCase());
      if (sid) studentIds.push(sid);
    }
    const ref = doc(collection(firestore, 'schools', schoolId, 'officeBillingAccounts'));
    accountIdByFamily.set(key, ref.id);
    billingOps.push((batch) =>
      batch.set(ref, {
        familyName: row.familyName.trim(),
        studentIds,
        balanceCents: row.balanceCents ?? 0,
        status: 'active' as const,
        contactEmail: row.contactEmail ?? null,
        contactPhone: row.contactPhone ?? null,
        notes: row.notes ?? null,
        updatedAt: Date.now(),
      }),
    );
    report.billingAccountsAdded += 1;
  }
  await commitBatches(firestore, billingOps);

  const invoiceOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  for (const row of snapshot.invoices ?? []) {
    const accountId = accountIdByFamily.get(row.familyName.trim().toLowerCase());
    if (!accountId) {
      report.errors.push(`Invoice "${row.label}": no billing account for family "${row.familyName}".`);
      continue;
    }
    const ref = doc(collection(firestore, 'schools', schoolId, 'officeInvoices'));
    invoiceOps.push((batch) =>
      batch.set(ref, {
        accountId,
        label: row.label,
        amountCents: row.amountCents,
        dueDate: row.dueDate ?? new Date().toISOString().slice(0, 10),
        status: row.status ?? 'sent',
        createdAt: Date.now(),
        paidAt: row.status === 'paid' ? Date.now() : null,
        paymentMethod: null,
        paymentNote: null,
      }),
    );
    report.invoicesAdded += 1;
  }
  await commitBatches(firestore, invoiceOps);

  if (ctx.canImportStaff) {
    for (const row of snapshot.staffAccounts ?? []) {
      try {
        await addStaffAccount(firestore, schoolId, {
          displayName: row.displayName,
          username: row.username,
          passcode: row.passcode,
          role: 'office',
          roles: ['office'],
        });
        report.staffAdded += 1;
      } catch (e) {
        report.errors.push(`Staff "${row.displayName}": ${(e as Error).message}`);
      }
    }
  } else if (snapshot.staffAccounts?.length) {
    report.errors.push('Office staff accounts were skipped (admin or office role required).');
  }

  const settingsPatch: { defaultActiveTerm?: string | null; statementSchoolName?: string | null } = {};
  if (snapshot.defaultActiveTerm?.trim()) settingsPatch.defaultActiveTerm = snapshot.defaultActiveTerm.trim();
  if (snapshot.statementSchoolName?.trim()) settingsPatch.statementSchoolName = snapshot.statementSchoolName.trim();
  if (Object.keys(settingsPatch).length > 0) {
    await saveOfficeSettings(firestore, schoolId, settingsPatch, ctx.updatedBy);
    report.settingsUpdated = true;
  }

  return report;
}

export function formatOfficeImportReport(report: OfficeAiImportReport): string {
  const parts: string[] = [];
  if (report.teachersAdded) parts.push(`${report.teachersAdded} teacher${report.teachersAdded === 1 ? '' : 's'}`);
  if (report.classesAdded) parts.push(`${report.classesAdded} class${report.classesAdded === 1 ? '' : 'es'}`);
  if (report.studentsAdded) parts.push(`${report.studentsAdded} student${report.studentsAdded === 1 ? '' : 's'} added`);
  if (report.studentsUpdated) parts.push(`${report.studentsUpdated} student${report.studentsUpdated === 1 ? '' : 's'} updated`);
  if (report.gradesAdded) parts.push(`${report.gradesAdded} grade${report.gradesAdded === 1 ? '' : 's'}`);
  if (report.gradesSkipped) parts.push(`${report.gradesSkipped} grade${report.gradesSkipped === 1 ? '' : 's'} skipped`);
  if (report.billingAccountsAdded) parts.push(`${report.billingAccountsAdded} billing account${report.billingAccountsAdded === 1 ? '' : 's'}`);
  if (report.invoicesAdded) parts.push(`${report.invoicesAdded} invoice${report.invoicesAdded === 1 ? '' : 's'}`);
  if (report.staffAdded) parts.push(`${report.staffAdded} staff login${report.staffAdded === 1 ? '' : 's'}`);
  if (report.settingsUpdated) parts.push('settings updated');
  return parts.length ? parts.join(' · ') : 'Nothing imported';
}
