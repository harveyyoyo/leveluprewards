/** Office pillar data — separate from rewards arcade collections. */

/** Office-only roster (not live-linked to rewards `students`). */
export type OfficeStudent = {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string | null;
  classId?: string | null;
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

export type OfficeInvoice = {
  id: string;
  accountId: string;
  label: string;
  amountCents: number;
  dueDate: string;
  status: OfficeInvoiceStatus;
  createdAt: number;
  paidAt?: number | null;
};

export type OfficeGradeEntryInput = Omit<OfficeGradeEntry, 'id' | 'updatedAt' | 'updatedBy'>;

export type OfficeBillingAccountInput = Omit<OfficeBillingAccount, 'id' | 'updatedAt'>;

export type OfficeInvoiceInput = Omit<OfficeInvoice, 'id' | 'createdAt' | 'paidAt'>;
