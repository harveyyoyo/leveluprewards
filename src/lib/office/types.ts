/** School Office pillar data (grades, billing, roster). Separate from rewards `students` / `teachers`. */

/** Homeroom / classroom teacher in School Office (not rewards `teachers`). */
export type OfficeTeacher = {
  id: string;
  name: string;
  email?: string | null;
  updatedAt: number;
  archived?: boolean;
  archivedAt?: number;
};

export type OfficeFamilyContactRole =
  | 'parent'
  | 'guardian'
  | 'grandparent'
  | 'emergency'
  | 'other';

/** Household contact on an `OfficeFamily` profile (parents, grandparents, emergency, etc.). */
export type OfficeFamilyContact = {
  id: string;
  name: string;
  role: OfficeFamilyContactRole;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
  isPrimary?: boolean;
  notes?: string | null;
};

/**
 * Full family profile — contacts, medical, legal, bus, and notes.
 * Billing accounts and students link via `familyId`.
 */
export type OfficeFamily = {
  id: string;
  displayName: string;
  contacts: OfficeFamilyContact[];
  medicalNotes?: string | null;
  legalNotes?: string | null;
  busRoute?: string | null;
  busNotes?: string | null;
  generalNotes?: string | null;
  updatedAt: number;
  updatedBy?: string | null;
  archived?: boolean;
  archivedAt?: number;
};

/** Office student roster. */
export type OfficeStudent = {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string | null;
  /** Link to `officeFamilies` household profile. */
  familyId?: string | null;
  photoUrl?: string | null;
  /** ISO date `YYYY-MM-DD`. */
  dateOfBirth?: string | null;
  classId?: string | null;
  /** Assigned homeroom teacher (`officeTeachers` doc id). */
  teacherId?: string | null;
  /** IDs of all teachers assigned to this class (co-teachers). If present, overrides teacherId. */
  teacherIds?: string[];
  /** Legacy free-text; prefer `teacherId` or `teacherIds`. Kept for old rows and CSV until migrated. */
  teacherName?: string | null;
  /** Student-level bus override; family `busRoute` is the default. */
  busRoute?: string | null;
  notes?: string | null;
  /** Free-form labels (e.g. "needs a ride", "scholarship") shown as chips. */
  tags?: string[] | null;
  /** Defaults to `active` when unset. Withdrawn/graduated students are hidden from the main roster by default. */
  status?: 'active' | 'withdrawn' | 'graduated' | null;
  updatedAt: number;
  archived?: boolean;
  archivedAt?: number;
};

export type OfficeClass = {
  id: string;
  name: string;
  /** Homeroom / primary teacher for this class (`officeTeachers` doc id). */
  teacherId?: string | null;
  /** IDs of all teachers assigned to this class (co-teachers). If present, overrides teacherId. */
  teacherIds?: string[];
  notes?: string | null;
  /** Soft cap used to show an over-capacity warning; no enforcement. */
  capacity?: number | null;
  /** Weekly timetable for this class (who teaches what, when). */
  schedule?: OfficeScheduleBlock[];
  updatedAt: number;
  archived?: boolean;
  archivedAt?: number;
};

/** One repeating time slot on a class's weekly schedule. */
export type OfficeScheduleBlock = {
  id: string;
  subject: string;
  teacherId?: string | null;
  /** 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** 24-hour "HH:MM". */
  startTime: string;
  endTime: string;
  room?: string | null;
};

export type OfficeAttendanceStatus ='present' | 'absent' | 'late' | 'excused';

/** One student's attendance mark for one class on one day (`schools/{id}/officeAttendance`). */
export type OfficeAttendanceEntry = {
  id: string;
  studentId: string;
  classId: string;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  status: OfficeAttendanceStatus;
  notes?: string | null;
  updatedAt: number;
  updatedBy?: string | null;
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
  archived?: boolean;
  archivedAt?: number;
};

export type OfficeBillingAccountStatus = 'active' | 'past_due' | 'closed';

export type OfficeBillingAccount = {
  id: string;
  familyName: string;
  /** Link to `officeFamilies` when using Option A family profiles. */
  familyId?: string | null;
  studentIds: string[];
  balanceCents: number;
  status: OfficeBillingAccountStatus;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  /** Standing discount/scholarship applied when staff create new invoices for this family. */
  discountLabel?: string | null;
  /** 0–100. Informational — staff apply it manually per invoice, it never changes amounts silently. */
  discountPercent?: number | null;
  updatedAt: number;
  archived?: boolean;
  archivedAt?: number;
};

export type OfficeInvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'void';

/** Ledger row for cash, check, card, transfer, and other payments. */
export type OfficePayment = {
  id: string;
  accountId: string;
  invoiceId?: string | null;
  amountCents: number;
  method: OfficePaymentMethod;
  note?: string | null;
  paidAt: number;
  recordedBy?: string | null;
};

export type OfficePaymentMethod = 'cash' | 'check' | 'card' | 'transfer' | 'other';

export type OfficeInvoice = {
  id: string;
  accountId: string;
  label: string;
  amountCents: number;
  dueDate: string;
  status: OfficeInvoiceStatus;
  createdAt: number;
  /** Cumulative payments applied to this invoice (supports partial pay). */
  paidAmountCents?: number | null;
  /** Partial-payment ledger field (mirrors paidAmountCents in newer writes). */
  paidCents?: number | null;
  paidAt?: number | null;
  /** How payment was recorded when marked paid outside Stripe. */
  paymentMethod?: OfficePaymentMethod | null;
  paymentNote?: string | null;
  archived?: boolean;
  archivedAt?: number;
};

export type OfficeGradeEntryInput = Omit<OfficeGradeEntry, 'id' | 'updatedAt' | 'updatedBy'>;

export type OfficeBillingAccountInput = Omit<OfficeBillingAccount, 'id' | 'updatedAt'>;

export type OfficeInvoiceInput = Omit<OfficeInvoice, 'id' | 'createdAt' | 'paidAt'>;

export type OfficeFeatureFlags = {
  familyProfiles?: boolean;
  studentPhotos?: boolean;
  busInfo?: boolean;
  medicalNotes?: boolean;
  aiHelp?: boolean;
  auditLog?: boolean;
  attendance?: boolean;
};

export type OfficeAuditAction = 'create' | 'update' | 'delete';

export type OfficeAuditEntityType =
  | 'officeStudent'
  | 'officeFamily'
  | 'officeClass'
  | 'officeTeacher'
  | 'officeGradeEntry'
  | 'officeBillingAccount'
  | 'officeInvoice'
  | 'officePayment'
  | 'officeAttendanceEntry'
  | 'officeForm'
  | 'officeEvent'
  | 'officeStudentDocument'
  | 'officeSettings';

/** Append-only change log (`schools/{id}/officeAuditLog`). */
export type OfficeAuditLogEntry = {
  id: string;
  entityType: OfficeAuditEntityType;
  entityId: string;
  action: OfficeAuditAction;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  changedBy?: string | null;
  changedAt: number;
};

export type OfficeFormResponseStatus = 'sent' | 'returned' | 'declined';

/**
 * A permission slip / form sent home for a class or the whole school
 * (`schools/{id}/officeForms`). Per-student status lives inline since target lists are small.
 */
export type OfficeForm = {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  /** `'all'` or a specific `officeClasses` doc id. */
  targetClassId: string;
  /** studentId -> status, seeded to `sent` for every targeted student when created. */
  responses: Record<string, OfficeFormResponseStatus>;
  createdAt: number;
  updatedAt: number;
  updatedBy?: string | null;
  archived?: boolean;
  archivedAt?: number;
};

/**
 * Metadata for a file uploaded for a student (report card, medical form, signed permission
 * slip, etc.) — `schools/{id}/officeStudentDocuments`. The actual file lives in Storage and is
 * never publicly readable; `storagePath` is only resolved to a real URL server-side, on demand,
 * after checking the requester's staff role for this school.
 */
export type OfficeStudentDocument = {
  id: string;
  studentId: string;
  name: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: number;
  uploadedBy?: string | null;
  archived?: boolean;
  archivedAt?: number;
};

/** A school calendar event (`schools/{id}/officeEvents`). */
export type OfficeEvent = {
  id: string;
  title: string;
  description?: string | null;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  updatedAt: number;
  updatedBy?: string | null;
  archived?: boolean;
  archivedAt?: number;
};

/** School-wide School Office preferences (`schools/{id}/officeSettings/config`). */
export type OfficeSettings = {
  defaultActiveTerm?: string | null;
  statementSchoolName?: string | null;
  /** School-defined term labels (e.g. Fall 2026) — appear in working-term dropdowns before any grades exist. */
  configuredTerms?: string[] | null;
  /** When true, UI says "Marks" instead of "Grades". */
  useMarksTerminology?: boolean;
  features?: OfficeFeatureFlags | null;
  updatedAt: number;
  updatedBy?: string | null;
};
