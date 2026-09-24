import type { OfficeGoTarget, OfficeNavId } from '@/lib/office/officeNav';
import type { OfficeAuditLogEntry } from '@/lib/office/types';

/** Everyday jobs Home can offer as shortcuts, each opening the right page (and form). */
export const OFFICE_TASKS = {
  'add-student': { label: 'Add student', go: 'students:add', section: 'students' },
  'update-student': { label: 'Update a student', go: 'students', section: 'students' },
  'add-teacher': { label: 'Add teacher', go: 'teachers:add', section: 'teachers' },
  'new-class': { label: 'New class', go: 'classes:add', section: 'classes' },
  'record-grades': { label: 'Record grades', go: 'grades', section: 'grades' },
  'take-attendance': { label: 'Take attendance', go: 'attendance', section: 'attendance' },
  'front-desk': { label: 'Log arrival or pickup', go: 'frontdesk', section: 'frontdesk' },
  'new-invoice': { label: 'New invoice', go: 'billing:new-invoice', section: 'billing' },
  'record-payment': { label: 'Record payment', go: 'billing', section: 'billing' },
  'permission-slip': { label: 'New permission slip', go: 'communication', section: 'communication' },
  'new-event': { label: 'New event', go: 'communication', section: 'communication' },
} as const satisfies Record<string, { label: string; go: OfficeGoTarget; section: OfficeNavId }>;

export type OfficeTaskId = keyof typeof OFFICE_TASKS;

/** Shown to someone with no history yet, and to fill the row out. */
const DEFAULT_TASKS: OfficeTaskId[] = ['add-student', 'take-attendance', 'new-invoice', 'record-grades'];

/** Which job a change in the history was part of. */
function taskForEntry(e: OfficeAuditLogEntry): OfficeTaskId | null {
  switch (e.entityType) {
    case 'officeStudent':
      return e.action === 'create' ? 'add-student' : e.action === 'update' ? 'update-student' : null;
    case 'officeTeacher':
      return e.action === 'create' ? 'add-teacher' : null;
    case 'officeClass':
      return e.action === 'create' ? 'new-class' : null;
    case 'officeGradeEntry':
      return e.action === 'delete' ? null : 'record-grades';
    case 'officeAttendanceEntry':
      return e.action === 'delete' ? null : 'take-attendance';
    case 'officeDeskLog':
      return e.action === 'create' ? 'front-desk' : null;
    case 'officeInvoice':
      return e.action === 'create' ? 'new-invoice' : null;
    case 'officePayment':
      return e.action === 'create' ? 'record-payment' : null;
    case 'officeForm':
      return e.action === 'create' ? 'permission-slip' : null;
    case 'officeEvent':
      return e.action === 'create' ? 'new-event' : null;
    default:
      return null;
  }
}

/**
 * The jobs this person does most, from the change history, filled out with everyday defaults.
 * One save that writes many rows (a whole class's attendance) counts once: rows from the same
 * minute are one job.
 */
export function officeCommonTasks(
  history: OfficeAuditLogEntry[],
  userName: string | null | undefined,
  isAvailable: (section: OfficeNavId) => boolean,
  count = 4,
): { tasks: OfficeTaskId[]; fromHistory: boolean } {
  const me = userName?.trim().toLowerCase();
  const jobs = new Map<OfficeTaskId, Set<number>>();
  if (me) {
    for (const e of history) {
      if (e.changedBy?.trim().toLowerCase() !== me) continue;
      const task = taskForEntry(e);
      if (!task) continue;
      const minutes = jobs.get(task) ?? new Set<number>();
      minutes.add(Math.floor(e.changedAt / 60_000));
      jobs.set(task, minutes);
    }
  }
  const ranked = [...jobs.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .map(([task]) => task)
    .filter((task) => isAvailable(OFFICE_TASKS[task].section));
  const tasks = [...ranked];
  for (const task of DEFAULT_TASKS) {
    if (tasks.length >= count) break;
    if (!tasks.includes(task) && isAvailable(OFFICE_TASKS[task].section)) tasks.push(task);
  }
  return { tasks: tasks.slice(0, count), fromHistory: ranked.length > 0 };
}
