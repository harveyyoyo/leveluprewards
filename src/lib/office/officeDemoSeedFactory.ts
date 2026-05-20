import type { Class, StaffAccount, Student } from '@/lib/types';
import type {
  OfficeBillingAccount,
  OfficeClass,
  OfficeGradeEntry,
  OfficeInvoice,
  OfficeStudent,
} from '@/lib/office/types';
import { getSuggestedTermLabel } from '@/lib/office/officeUtils';

const OFFICE_DEMO_STAFF_ACCOUNT_ID = 'demo_office_staff';

export type OfficeDemoVariant = 'schoolabc' | 'yeshiva';

export type OfficeDemoSeedInput = {
  variant: OfficeDemoVariant;
  students: Pick<Student, 'id' | 'firstName' | 'lastName' | 'nickname' | 'classId'>[];
  classes: Pick<Class, 'id' | 'name'>[];
};

export type OfficeDemoSeedPayload = {
  officeStudents: OfficeStudent[];
  officeClasses: OfficeClass[];
  gradeEntries: OfficeGradeEntry[];
  billingAccounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
  staffAccounts: StaffAccount[];
};

function hashToIndex(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

function isoDateDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function priorTermLabel(active: string): string {
  const match = active.match(/^(Fall|Spring|Winter)\s+(\d{4})$/);
  if (!match) return `Spring ${new Date().getFullYear() - 1}`;
  const [, season, yearStr] = match;
  const year = Number(yearStr);
  if (season === 'Fall') return `Spring ${year}`;
  if (season === 'Spring') return `Winter ${year}`;
  return `Fall ${year - 1}`;
}

const SCHOOLABC_SUBJECTS = ['Math', 'English', 'Science', 'Social Studies', 'Reading'] as const;
const YESHIVA_SUBJECTS = ['Gemara', 'Halacha', 'Chumash', 'Navi', 'English'] as const;

const LETTER_GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'] as const;
const NUMERIC_BY_LETTER: Record<(typeof LETTER_GRADES)[number], number> = {
  A: 96,
  'A-': 92,
  'B+': 88,
  B: 85,
  'B-': 82,
  'C+': 78,
  C: 74,
};

const TEACHER_NAMES_SCHOOLABC = [
  'Mr. Smith',
  'Mrs. Jones',
  'Ms. Davis',
  'Mr. Brown',
  'Mrs. Anderson',
] as const;

const TEACHER_NAMES_YESHIVA = [
  'Rabbi Cohen',
  'Rabbi Levi',
  'Rav Goldberg',
  'Rosh Yeshiva',
  'Rabbi Epstein',
] as const;

export function buildOfficeDemoStaffAccount(variant: OfficeDemoVariant): StaffAccount {
  return {
    id: OFFICE_DEMO_STAFF_ACCOUNT_ID,
    username: 'office',
    passcode: '1234',
    displayName: variant === 'yeshiva' ? 'Yeshiva Office' : 'School Office',
    role: 'office',
    roles: ['office'],
    email: variant === 'yeshiva' ? 'office@yeshiva-demo.example' : 'office@schoolabc.example',
    phone: '(555) 010-0100',
  };
}

/**
 * Builds office roster, grades, and billing demo data aligned with rewards sample IDs.
 */
export function buildOfficeDemoSeed(input: OfficeDemoSeedInput): OfficeDemoSeedPayload {
  const now = Date.now();
  const activeTerm = getSuggestedTermLabel();
  const priorTerm = priorTermLabel(activeTerm);
  const subjects = input.variant === 'yeshiva' ? YESHIVA_SUBJECTS : SCHOOLABC_SUBJECTS;
  const teacherNames =
    input.variant === 'yeshiva' ? TEACHER_NAMES_YESHIVA : TEACHER_NAMES_SCHOOLABC;

  const officeClasses: OfficeClass[] = input.classes.map((c) => ({
    id: c.id,
    name: c.name?.trim() || 'Class',
    updatedAt: now,
  }));

  const officeStudents: OfficeStudent[] = input.students.map((s) => ({
    id: s.id,
    firstName: s.firstName?.trim() || 'Student',
    lastName: s.lastName?.trim() || '',
    nickname: s.nickname?.trim() || null,
    classId: s.classId ?? null,
    teacherName: teacherNames[hashToIndex(s.id, teacherNames.length)] ?? null,
    notes: null,
    updatedAt: now,
  }));

  const gradeEntries: OfficeGradeEntry[] = [];
  for (const student of officeStudents) {
    const gradeStudent = hashToIndex(student.id, 10);
    // Leave ~10% without current-term grades for dashboard "needs attention".
    if (gradeStudent === 0) continue;

    const terms = gradeStudent % 4 === 0 ? [activeTerm, priorTerm] : [activeTerm];
    for (const termLabel of terms) {
      for (const subject of subjects) {
        const letter = LETTER_GRADES[hashToIndex(`${student.id}:${subject}:${termLabel}`, LETTER_GRADES.length)];
        gradeEntries.push({
          id: `og-${student.id}-${subject.toLowerCase().replace(/\s+/g, '-')}-${termLabel.replace(/\s+/g, '-')}`,
          studentId: student.id,
          classId: student.classId,
          termLabel,
          subject,
          letterGrade: letter,
          numericGrade: NUMERIC_BY_LETTER[letter],
          notes: null,
          updatedAt: now - hashToIndex(subject, 14) * 86_400_000,
          updatedBy: 'demo-seed',
        });
      }
    }
  }

  const billingAccounts: OfficeBillingAccount[] = [];
  const invoices: OfficeInvoice[] = [];

  const byLastName = new Map<string, OfficeStudent[]>();
  for (const s of officeStudents) {
    const key = s.lastName.trim().toLowerCase() || 'family';
    const list = byLastName.get(key) ?? [];
    list.push(s);
    byLastName.set(key, list);
  }

  const familyGroups = [...byLastName.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 22);

  familyGroups.forEach(([lastKey, members], index) => {
    const accountId = `oba-${index + 1}`;
    const familyName =
      members[0]?.lastName?.trim() ? `${members[0].lastName} Family` : `Family ${index + 1}`;
    const studentIds = members.slice(0, 2).map((m) => m.id);
    const isPastDue = index % 5 === 0;
    const status: OfficeBillingAccount['status'] =
      index % 11 === 0 ? 'closed' : isPastDue ? 'past_due' : 'active';

    billingAccounts.push({
      id: accountId,
      familyName,
      studentIds,
      balanceCents: 0,
      status,
      contactEmail: `${lastKey.replace(/[^a-z0-9]/g, '') || 'family'}@example.com`,
      contactPhone: index % 3 === 0 ? `(555) 010-${String(index + 1).padStart(4, '0')}` : null,
      notes: index % 7 === 0 ? 'Sibling discount on file.' : null,
      updatedAt: now,
    });

    const tuitionCents = 125_000 + (index % 4) * 15_000;
    const activityCents = 35_000 + (index % 3) * 5_000;

    invoices.push({
      id: `oinv-${accountId}-tuition`,
      accountId,
      label: input.variant === 'yeshiva' ? 'Tuition — semester' : 'Tuition — fall term',
      amountCents: tuitionCents,
      dueDate: isoDateDaysFromNow(isPastDue ? -12 : 18),
      status: isPastDue ? 'sent' : index % 4 === 1 ? 'paid' : 'sent',
      createdAt: now - 45 * 86_400_000,
      paidAt: index % 4 === 1 ? now - 5 * 86_400_000 : null,
    });

    invoices.push({
      id: `oinv-${accountId}-activity`,
      accountId,
      label: input.variant === 'yeshiva' ? 'Activities & trips' : 'Activities fee',
      amountCents: activityCents,
      dueDate: isoDateDaysFromNow(index % 2 === 0 ? 30 : -5),
      status: index % 6 === 2 ? 'draft' : 'sent',
      createdAt: now - 20 * 86_400_000,
      paidAt: null,
    });

    if (index % 3 === 0) {
      invoices.push({
        id: `oinv-${accountId}-lunch`,
        accountId,
        label: 'Lunch program',
        amountCents: 18_500,
        dueDate: isoDateDaysFromNow(45),
        status: 'paid',
        createdAt: now - 90 * 86_400_000,
        paidAt: now - 60 * 86_400_000,
      });
    }
  });

  for (const account of billingAccounts) {
    const open = invoices
      .filter((i) => i.accountId === account.id && (i.status === 'sent' || i.status === 'draft'))
      .reduce((sum, i) => sum + i.amountCents, 0);
    account.balanceCents = open;
  }

  return {
    officeStudents,
    officeClasses,
    gradeEntries,
    billingAccounts,
    invoices,
    staffAccounts: [buildOfficeDemoStaffAccount(input.variant)],
  };
}
