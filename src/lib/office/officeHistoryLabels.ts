import type { OfficeAuditEntityType, OfficeAuditLogEntry } from '@/lib/office/types';

/** Plain-language groups for the History filter chips. */
export type OfficeHistoryGroup =
  | 'all'
  | 'students'
  | 'classes'
  | 'teachers'
  | 'grades'
  | 'billing'
  | 'attendance'
  | 'transportation'
  | 'communication'
  | 'settings'
  | 'assistant';

export const OFFICE_HISTORY_GROUPS: Array<{ id: OfficeHistoryGroup; label: string }> = [
  { id: 'all', label: 'Everything' },
  { id: 'students', label: 'Students & families' },
  { id: 'classes', label: 'Classes' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'grades', label: 'Grades' },
  { id: 'billing', label: 'Billing' },
  { id: 'attendance', label: 'Attendance & front desk' },
  { id: 'transportation', label: 'Transportation' },
  { id: 'communication', label: 'Forms & events' },
  { id: 'settings', label: 'Settings' },
  { id: 'assistant', label: 'Help reading records' },
];

const GROUP_BY_TYPE: Record<OfficeAuditEntityType, OfficeHistoryGroup> = {
  officeStudent: 'students',
  officeFamily: 'students',
  officeStudentDocument: 'students',
  officeClass: 'classes',
  officeTeacher: 'teachers',
  officeGradeEntry: 'grades',
  officeBillingAccount: 'billing',
  officeInvoice: 'billing',
  officePayment: 'billing',
  officeAttendanceEntry: 'attendance',
  officeDeskLog: 'attendance',
  officeBusRoute: 'transportation',
  officeBusTrip: 'transportation',
  officeForm: 'communication',
  officeEvent: 'communication',
  officeSettings: 'settings',
  officeAssistant: 'assistant',
};

export function officeHistoryGroup(entry: Pick<OfficeAuditLogEntry, 'entityType'>): OfficeHistoryGroup {
  return GROUP_BY_TYPE[entry.entityType] ?? 'all';
}

export function officeHistoryActionLabel(
  entry: Pick<OfficeAuditLogEntry, 'action' | 'summary'> & Partial<Pick<OfficeAuditLogEntry, 'entityType'>>,
): string {
  if (entry.entityType === 'officeAssistant') return 'Read';
  if (entry.action === 'create') return 'Added';
  if (entry.action === 'delete') return 'Removed';
  return 'Changed';
}

/** Friendly names for the fields shown in "What changed". Unknown fields fall back to spaced words. */
const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  nickname: 'Nickname',
  classId: 'Class',
  teacherId: 'Teacher',
  teacherIds: 'Teachers',
  teacherName: 'Teacher name',
  familyId: 'Family',
  status: 'Status',
  notes: 'Notes',
  tags: 'Tags',
  busRoute: 'Bus route',
  transportMode: 'Gets home by',
  busRouteId: 'Bus route',
  busStopId: 'Bus stop',
  name: 'Name',
  email: 'Email',
  capacity: 'Class size limit',
  vehicle: 'Vehicle details',
  make: 'Make',
  model: 'Model',
  year: 'Year',
  plate: 'License plate',
  vin: 'VIN',
  inspectionDue: 'Inspection due',
  insuranceDue: 'Insurance due',
  pickupAuthorized: 'Allowed for bus pickup',
  transportNotificationsEnabled: 'Transportation emails',
  displayName: 'Family name',
  familyName: 'Family name',
  contactEmail: 'Email',
  contactPhone: 'Phone',
  discountLabel: 'Discount',
  discountPercent: 'Discount %',
  studentIds: 'Students',
  label: 'Description',
  amountCents: 'Amount',
  paidCents: 'Paid',
  paidAmountCents: 'Paid',
  balanceCents: 'Balance',
  dueDate: 'Due date',
  method: 'Payment method',
  paymentMethod: 'Payment method',
  paymentNote: 'Payment note',
  subject: 'Subject',
  termLabel: 'Term',
  letterGrade: 'Letter grade',
  numericGrade: 'Score',
  title: 'Title',
  description: 'Description',
  date: 'Date',
  archived: 'Removed',
};

/** Bookkeeping fields that would only add noise to "What changed". */
const HIDDEN_FIELDS = new Set(['id', 'updatedAt', 'updatedBy', 'createdAt', 'archivedAt', 'archivedBy']);

export function officeHistoryFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Looks up a person/class/family name from a stored record id; undefined when unknown. */
export type OfficeHistoryNameLookup = (id: string) => string | undefined;

/** Fields whose values are record ids that should be shown as names. */
const ID_FIELDS = new Set(['teacherId', 'classId', 'familyId', 'studentId', 'accountId', 'targetClassId']);
const ID_LIST_FIELDS = new Set(['teacherIds', 'studentIds', 'addedClassIds', 'removedClassIds']);

function formatValue(key: string, value: unknown, nameFor?: OfficeHistoryNameLookup): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && ID_FIELDS.has(key)) return nameFor?.(value) ?? value;
  if (typeof value === 'number' && /cents$/i.test(key)) return `$${(value / 100).toFixed(2)}`;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    if (ID_LIST_FIELDS.has(key) && value.length <= 5 && value.every((v) => typeof v === 'string')) {
      return (value as string[]).map((id) => nameFor?.(id) ?? id).join(', ');
    }
    if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return value.length <= 5 ? value.join(', ') : `${value.length} items`;
    }
    return `${value.length} item${value.length === 1 ? '' : 's'}`;
  }
  if (typeof value === 'object') return 'Details';
  return String(value);
}

export type OfficeHistoryChange = { field: string; before: string; after: string };

/** Field-by-field differences between an entry's before and after snapshots. */
export function officeHistoryChanges(
  entry: Pick<OfficeAuditLogEntry, 'before' | 'after'>,
  nameFor?: OfficeHistoryNameLookup,
): OfficeHistoryChange[] {
  const before = entry.before ?? {};
  const after = entry.after ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: OfficeHistoryChange[] = [];
  for (const key of keys) {
    if (HIDDEN_FIELDS.has(key)) continue;
    // Only show fields the "after" side actually mentions when this was a partial update.
    if (entry.before && !(key in after)) continue;
    const b = formatValue(key, before[key], nameFor);
    const a = formatValue(key, after[key], nameFor);
    if (entry.before && a === b) continue;
    if (!entry.before && a === '—') continue;
    changes.push({ field: officeHistoryFieldLabel(key), before: b, after: a });
  }
  return changes;
}

export function officeHistoryDayLabel(ts: number, now = Date.now()): string {
  const day = new Date(ts);
  const today = new Date(now);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(day)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return day.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: day.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}
