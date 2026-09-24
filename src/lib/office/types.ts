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
  /** Home address on one line, e.g. "12 Oak St, Springfield, NJ 07081". */
  homeAddress?: string | null;
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
  /** Optional details — see `OFFICE_STUDENT_DETAIL_FIELDS`. */
  studentNumber?: string | null;
  gender?: string | null;
  /** ISO date `YYYY-MM-DD`. */
  enrollmentDate?: string | null;
  previousSchool?: string | null;
  homeLanguage?: string | null;
  allergies?: string | null;
  healthNotes?: string | null;
  pickupNotes?: string | null;
  /** How the student gets to and from school (Transportation page). Unset = not chosen yet. */
  transportMode?: OfficeTransportMode | null;
  /** Bus route they ride (`officeBusRoutes` doc id) when `transportMode` is `bus`. */
  busRouteId?: string | null;
  /** Their stop on that route (`OfficeBusStop.id`). */
  busStopId?: string | null;
  /** Values for school-defined fields, keyed by `OfficeCustomFieldDef.id`. */
  customFields?: Record<string, OfficeCustomFieldValue> | null;
  updatedAt: number;
  archived?: boolean;
  archivedAt?: number;
};

export type OfficeCustomFieldType = 'text' | 'longText' | 'number' | 'date' | 'yesNo' | 'choice';
export type OfficeCustomFieldValue = string | number | boolean | null;

/** A school-defined student field, created in Settings. Never deleted — hiding keeps saved values. */
export type OfficeCustomFieldDef = {
  id: string;
  label: string;
  type: OfficeCustomFieldType;
  /** Choices for `choice` fields. */
  options?: string[];
  archived?: boolean;
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

export type OfficeDeskLogKind = 'late_arrival' | 'early_pickup' | 'nurse_visit';

/** One front-desk event (`schools/{id}/officeDeskLog`): late arrival, early pickup, or nurse visit. */
export type OfficeDeskLogEntry = {
  id: string;
  kind: OfficeDeskLogKind;
  studentId: string;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  /** 24-hour "HH:MM". */
  time: string;
  /** Why they were late / leaving / came to the nurse. */
  reason?: string | null;
  /** Early pickup: who took the student. */
  pickedUpBy?: string | null;
  /** Early pickup: whether that person is on the family's contact list. */
  pickupApproved?: boolean | null;
  /** Nurse: what was done (ice pack, rest, medication given…). */
  nurseAction?: string | null;
  parentContacted?: boolean | null;
  sentHome?: boolean | null;
  notes?: string | null;
  recordedBy?: string | null;
  createdAt: number;
  archived?: boolean;
  archivedAt?: number;
};

export type OfficeTransportMode = 'bus' | 'car' | 'walk' | 'aftercare';

/** One pickup / drop-off point on a bus route. */
export type OfficeBusStop = {
  id: string;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  /** Planned morning time, 24-hour "HH:MM". */
  amTime?: string | null;
  /** Planned afternoon time, 24-hour "HH:MM". */
  pmTime?: string | null;
  /** The school itself: the end of the morning run and the start of the afternoon run. */
  isSchool?: boolean;
};

export type OfficeBusVehicleDetails = {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  plate?: string | null;
  vin?: string | null;
  inspectionDue?: string | null;
  insuranceDue?: string | null;
  notes?: string | null;
};

/** A bus route (`schools/{id}/officeBusRoutes`). Morning runs the stops in order, afternoon in reverse. */
export type OfficeBusRoute = {
  id: string;
  name: string;
  busNumber?: string | null;
  /** Hex colour for the map and chips. */
  color: string;
  driverName?: string | null;
  driverPhone?: string | null;
  /** Seats on the bus; used for the "full" warning only. */
  capacity?: number | null;
  /** Optional vehicle identity and maintenance dates. */
  vehicle?: OfficeBusVehicleDetails | null;
  stops: OfficeBusStop[];
  notes?: string | null;
  updatedAt: number;
  updatedBy?: string | null;
  archived?: boolean;
  archivedAt?: number;
};

/** The route details needed to read a past trip after the route is edited or removed. */
export type OfficeBusRouteSnapshot = Pick<OfficeBusRoute, 'name' | 'busNumber' | 'color' | 'vehicle' | 'stops'>;

export type OfficeBusRun = 'am' | 'pm';
export type OfficeBusRiderStatus = 'on' | 'off' | 'absent';
export type OfficeBusAlertKind = 'delay' | 'breakdown' | 'accident' | 'behavior' | 'other';

export type OfficeBusTripAlert = {
  id: string;
  kind: OfficeBusAlertKind;
  message?: string | null;
  /** Delay reports: extra minutes expected. */
  minutes?: number | null;
  at: number;
  by?: string | null;
};

export type OfficeBusLocation = {
  lat: number;
  lng: number;
  /** Metres. */
  accuracy?: number | null;
  /** Metres per second. */
  speed?: number | null;
  heading?: number | null;
  at: number;
};

export type OfficeBusEvent =
  | { kind: 'rider'; studentId: string; status: OfficeBusRiderStatus | null; at: number; by: string }
  | { kind: 'stop'; stopId: string; reached: boolean; at: number; by: string };

export type OfficeBusRiderManifestEntry = {
  studentId: string;
  displayName: string;
  familyId?: string | null;
  busStopId?: string | null;
};

/**
 * One bus run on one day (`schools/{id}/officeBusTrips`, id starts with `{date}_{routeId}_{run}`):
 * live location, stops reached, and who got on and off. Never erased or overwritten.
 */
export type OfficeBusTrip = {
  id: string;
  routeId: string;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  run: OfficeBusRun;
  /** Keeps old history readable if the route is later renamed, moved, or removed. */
  routeSnapshot?: OfficeBusRouteSnapshot | null;
  /** Student ids assigned when the run began, so later roster edits do not change this run. */
  riderSnapshot?: string[] | null;
  /** Immutable names, family links, and stops captured when the run began. */
  riderManifest?: OfficeBusRiderManifestEntry[] | null;
  /** Retry bookkeeping lives on the base trip so concurrent starts cannot create two active runs. */
  retryCount?: number;
  activeRetryId?: string | null;
  status: 'active' | 'done';
  driverId?: string | null;
  driverName?: string | null;
  startedAt: number;
  endedAt?: number | null;
  location?: OfficeBusLocation | null;
  /** stopId -> time the bus reached it. */
  stopArrivals?: Record<string, number> | null;
  /** studentId -> latest status on this run. */
  riders?: Record<string, { status: OfficeBusRiderStatus; at: number }> | null;
  alerts?: OfficeBusTripAlert[] | null;
  /** Append-only rider and stop events kept for the safety record. */
  events?: OfficeBusEvent[] | null;
  /** Driver walked the bus at the end and confirmed nobody was left on. */
  childCheckDone?: boolean | null;
  updatedAt: number;
};

export type OfficeAttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

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
  /** Bus fields on families and students, and the Transportation page. */
  busInfo?: boolean;
  medicalNotes?: boolean;
  aiHelp?: boolean;
  /**
   * Help may read records (as codes, without names or contact details) to answer questions that
   * need thinking, like "summarize this student". Off keeps every record away from the AI.
   */
  aiRecords?: boolean;
  auditLog?: boolean;
  attendance?: boolean;
  /** Late arrivals, early pickups, and nurse visits log. */
  frontDesk?: boolean;
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
  | 'officeDeskLog'
  | 'officeBusRoute'
  | 'officeBusTrip'
  | 'officeForm'
  | 'officeEvent'
  | 'officeStudentDocument'
  | 'officeSettings'
  /** Help read student records to answer a question (who asked, how many students, which kinds). */
  | 'officeAssistant';

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
  /** Extra student fields this school added in Settings. */
  studentCustomFields?: OfficeCustomFieldDef[] | null;
  /** Where the school is, so the Transportation map opens there. */
  transportSchoolLocation?: { address?: string | null; lat: number; lng: number } | null;
  updatedAt: number;
  updatedBy?: string | null;
};
