/** School Office pillar data (grades, billing, roster). Separate from rewards `students` / `teachers`. */

/** Homeroom / classroom teacher in School Office (not rewards `teachers`). */
export type OfficeTeacher = {
  id: string;
  name: string;
  email?: string | null;
  updatedAt: number;
};

/** Office student roster. */
export type OfficeStudent = {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string | null;
  classId?: string | null;
  /** Assigned homeroom teacher (`officeTeachers` doc id). */
  teacherId?: string | null;
  /** Legacy free-text; prefer `teacherId`. Kept for old rows and CSV until migrated. */
  teacherName?: string | null;
  notes?: string | null;
  updatedAt: number;
};

export type OfficeClass = {
  id: string;
  name: string;
  updatedAt: number;
};

export type OfficeGradeEntry = {
  id: string;
  studentId: string;
  classId?: string | null;
  termLabel: string;
  subject: string;
  letterGrade?: string | null;
  numericGrade?: number | null;
  notes?: string | null;
  updatedAt: number;
  updatedBy?: string | null;
};

export type OfficeBillingAccountStatus = 'active' | 'past_due' | 'closed';

export type OfficeBillingAccount = {
  id: string;
  familyName: string;
  studentIds: string[];
  balanceCents: number;
  status: OfficeBillingAccountStatus;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  updatedAt: number;
};

export type OfficeInvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';

export type OfficePaymentMethod = 'cash' | 'check' | 'card' | 'transfer' | 'other';

export type OfficeInvoice = {
  id: string;
  accountId: string;
  label: string;
  amountCents: number;
  dueDate: string;
  status: OfficeInvoiceStatus;
  createdAt: number;
  paidAt?: number | null;
  /** How payment was recorded when marked paid outside Stripe. */
  paymentMethod?: OfficePaymentMethod | null;
  paymentNote?: string | null;
};

export type OfficeGradeEntryInput = Omit<OfficeGradeEntry, 'id' | 'updatedAt' | 'updatedBy'>;

export type OfficeBillingAccountInput = Omit<OfficeBillingAccount, 'id' | 'updatedAt'>;

export type OfficeInvoiceInput = Omit<OfficeInvoice, 'id' | 'createdAt' | 'paidAt'>;

/** School-wide School Office preferences (`schools/{id}/officeSettings/config`). */
export type OfficeSettings = {
  defaultActiveTerm?: string | null;
  statementSchoolName?: string | null;
  /** School-defined term labels (e.g. Fall 2026) — appear in working-term dropdowns before any grades exist. */
  configuredTerms?: string[] | null;
  updatedAt: number;
  updatedBy?: string | null;
};
