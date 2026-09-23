import type { Class, StaffAccount, Student, Teacher } from '@/lib/types';
import type {
  OfficeBillingAccount,
  OfficeClass,
  OfficeFamily,
  OfficeGradeEntry,
  OfficeInvoice,
  OfficeStudent,
  OfficeTeacher,
} from '@/lib/office/types';
import { getSuggestedTermLabel } from '@/lib/office/officeUtils';
import { accountBalanceFromInvoices } from '@/lib/office/officeBillingPayments';

const OFFICE_DEMO_STAFF_ACCOUNT_ID = 'demo_office_staff';

export type OfficeDemoVariant = 'schoolabc' | 'yeshiva';

export type OfficeDemoSeedInput = {
  variant: OfficeDemoVariant;
  students: Pick<Student, 'id' | 'firstName' | 'lastName' | 'nickname' | 'classId'>[];
  classes: Pick<Class, 'id' | 'name' | 'primaryTeacherId'>[];
  teachers?: Pick<Teacher, 'id' | 'name' | 'email'>[];
};

export type OfficeDemoSeedPayload = {
  officeTeachers: OfficeTeacher[];
  officeStudents: OfficeStudent[];
  officeClasses: OfficeClass[];
  officeFamilies: OfficeFamily[];
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

const DEMO_PARENT_FIRST = {
  schoolabc: {
    a: ['Sarah', 'Jennifer', 'Emily', 'Rachel', 'Laura', 'Megan', 'Hannah', 'Rebecca', 'Nicole', 'Amanda'],
    b: ['Michael', 'David', 'James', 'Daniel', 'Robert', 'Matthew', 'Andrew', 'Joseph', 'Brian', 'Kevin'],
  },
  yeshiva: {
    a: ['Rivka', 'Chana', 'Leah', 'Sara', 'Miriam', 'Esther', 'Devorah', 'Shira', 'Tova', 'Rochel'],
    b: ['Moshe', 'Yosef', 'Avraham', 'Dovid', 'Yaakov', 'Shmuel', 'Chaim', 'Eliyahu', 'Binyamin', 'Menachem'],
  },
} as const;

const DEMO_STREETS = ['Oak Street', 'Maple Avenue', 'Cedar Lane', 'Elm Road', 'Birch Court', 'Willow Way', 'Pine Street', 'Chestnut Drive'];
const DEMO_ALLERGIES = ['Peanuts', 'Tree nuts', 'Dairy', 'Bee stings'];

/**
 * Fake households for demo students: siblings (same last name) share one family with two parent
 * contacts, phone numbers, emails, and a home address. Deterministic so re-running gives the same data.
 */
export function buildOfficeDemoFamilies(
  variant: OfficeDemoVariant,
  students: Pick<OfficeStudent, 'id' | 'lastName' | 'firstName'>[],
): { families: OfficeFamily[]; familyIdByStudentId: Map<string, string> } {
  const now = Date.now();
  const names = DEMO_PARENT_FIRST[variant];
  const byLast = new Map<string, typeof students>();
  for (const s of students) {
    const key = (s.lastName?.trim() || s.firstName?.trim() || 'family').toLowerCase();
    byLast.set(key, [...(byLast.get(key) ?? []), s]);
  }
  const families: OfficeFamily[] = [];
  const familyIdByStudentId = new Map<string, string>();
  for (const [key, members] of [...byLast.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const last = members[0].lastName?.trim() || members[0].firstName?.trim() || 'Family';
    const slug = key.replace(/[^a-z0-9]/g, '') || 'family';
    const id = `ofam-${slug}`;
    const h = hashToIndex(key, 10_000);
    const parentA = names.a[h % names.a.length];
    const parentB = names.b[(h >> 3) % names.b.length];
    const phone = (n: number) => `(555) 01${n % 10}-${String(1000 + ((h + n * 37) % 9000)).padStart(4, '0')}`;
    families.push({
      id,
      displayName: `${last} family`,
      homeAddress: `${10 + (h % 890)} ${DEMO_STREETS[h % DEMO_STREETS.length]}, Springfield, NJ 07081`,
      contacts: [
        {
          id: `${id}-a`,
          name: `${parentA} ${last}`,
          role: 'parent',
          relationship: 'Mother',
          phone: phone(1),
          email: `${parentA.toLowerCase()}.${slug}@example.com`,
          isPrimary: true,
          notes: null,
        },
        {
          id: `${id}-b`,
          name: `${parentB} ${last}`,
          role: 'parent',
          relationship: 'Father',
          phone: phone(2),
          email: `${parentB.toLowerCase()}.${slug}@example.com`,
          isPrimary: false,
          notes: null,
        },
      ],
      medicalNotes: h % 9 === 0 ? 'Carries an EpiPen — nurse has a spare.' : null,
      legalNotes: h % 17 === 0 ? 'Custody paperwork on file. Check with the office before releasing to anyone not listed.' : null,
      busRoute: h % 3 === 0 ? `Route ${1 + (h % 6)}` : null,
      busNotes: null,
      generalNotes: null,
      updatedAt: now,
      updatedBy: 'demo-seed',
    });
    for (const m of members) familyIdByStudentId.set(m.id, id);
  }
  return { families, familyIdByStudentId };
}

/** A few sample details so the student "Details" section has something to show in the demo. */
export function demoStudentDetails(studentId: string): Partial<OfficeStudent> {
  const h = hashToIndex(studentId, 1000);
  const year = new Date().getFullYear() - 1 - (h % 4);
  const born = new Date().getFullYear() - 6 - (h % 12);
  return {
    dateOfBirth: `${born}-${String(1 + ((h * 7) % 12)).padStart(2, '0')}-${String(1 + ((h * 13) % 28)).padStart(2, '0')}`,
    studentNumber: `S${String(10000 + h * 7).slice(0, 5)}`,
    enrollmentDate: `${year}-09-0${1 + (h % 5)}`,
    allergies: h % 11 === 0 ? DEMO_ALLERGIES[h % DEMO_ALLERGIES.length] : null,
    pickupNotes: h % 13 === 0 ? 'Grandmother picks up on Fridays.' : null,
  };
}

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

  // 1. Create office teachers from rewards teachers if available, else fallback to presets.
  const officeTeachers: OfficeTeacher[] = input.teachers?.length 
    ? input.teachers.map(t => ({
        id: t.id,
        name: t.name,
        email: t.email ?? null,
        updatedAt: now
      }))
    : teacherNames.map((teacherName, index) => ({
        id: `oteacher-${input.variant}-${index + 1}`,
        name: teacherName,
        email: null,
        updatedAt: now,
      }));

  const officeTeacherById = new Map(officeTeachers.map(t => [t.id, t]));

  // 2. Create office classes, assigning the teacher from the rewards class record.
  const officeClasses: OfficeClass[] = input.classes.map((c, index) => {
    // Try to find the teacher assigned to this class in rewards.
    let teacherId: string | null = null;
    if (c.primaryTeacherId && officeTeacherById.has(c.primaryTeacherId)) {
      teacherId = c.primaryTeacherId;
    } else {
      // Fallback to round-robin if mapping fails.
      teacherId = officeTeachers[index % officeTeachers.length]?.id ?? null;
    }
    
    return {
      id: c.id,
      name: c.name?.trim() || 'Class',
      teacherId,
      updatedAt: now,
    };
  });

  const officeClassById = new Map(officeClasses.map(c => [c.id, c]));

  // 3. Create office students, assigning them to the teacher of their class, grouped into families.
  const { families: officeFamilies, familyIdByStudentId } = buildOfficeDemoFamilies(input.variant, input.students);
  const officeStudents: OfficeStudent[] = input.students.map((s) => {
    const cls = s.classId ? officeClassById.get(s.classId) : null;
    return {
      ...demoStudentDetails(s.id),
      familyId: familyIdByStudentId.get(s.id) ?? null,
      id: s.id,
      firstName: s.firstName?.trim() || 'Student',
      lastName: s.lastName?.trim() || '',
      nickname: s.nickname?.trim() || null,
      classId: s.classId ?? null,
      // Assign the teacher from the class, with NO random fallback.
      teacherId: cls?.teacherId ?? null,
      teacherName: null,
      notes: null,
      updatedAt: now,
    };
  });

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
      familyId: members[0] ? familyIdByStudentId.get(members[0].id) ?? null : null,
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
    account.balanceCents = accountBalanceFromInvoices(
      account.id,
      invoices.filter((i) => i.accountId === account.id),
    );
  }

  return {
    officeTeachers,
    officeStudents,
    officeClasses,
    officeFamilies,
    gradeEntries,
    billingAccounts,
    invoices,
    staffAccounts: [buildOfficeDemoStaffAccount(input.variant)],
  };
}
