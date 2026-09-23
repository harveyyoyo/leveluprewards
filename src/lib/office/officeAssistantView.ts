import { z } from 'zod';
import { officePublicHref } from '@/lib/officePublicUrl';

/**
 * "Show me …" questions in Help → Ask become one of these views. The AI only chooses filters from
 * the question; the app then shows the matching records itself, so no student records are sent to
 * the AI service.
 */

export const STUDENT_SHOW_OPTIONS = [
  'missing-grades',
  'no-billing',
  'unassigned',
  'no-teacher',
  'no-family',
  'allergies',
  'withdrawn',
  'graduated',
] as const;

export const BILLING_STATUS_OPTIONS = ['open', 'overdue', 'due-soon'] as const;

const text = z
  .string()
  .trim()
  .max(80)
  .nullish()
  .transform((v) => (v ? v : null));

const money = z
  .number()
  .finite()
  .min(0)
  .max(10_000_000)
  .nullish()
  .transform((v) => (v == null ? null : Math.round(v * 100) / 100));

/** Start of a first or last name ("L", "Mc"): letters only, a few at most. */
const nameStart = z
  .string()
  .trim()
  .max(12)
  .nullish()
  .transform((v) => (v && /^[\p{L}' -]+$/u.test(v) ? v : null));

const studentsView = z.object({
  page: z.literal('students'),
  label: z.string().trim().min(1).max(120),
  // A single letter isn't a name search (it would match nearly everyone); starts-with covers that.
  text: text.transform((v) => (v && v.length >= 2 ? v : null)),
  lastNameStarts: nameStart,
  firstNameStarts: nameStart,
  /** 1–12: students whose birthday falls in that month. */
  birthMonth: z.number().int().min(1).max(12).nullish().transform((v) => v ?? null),
  className: text,
  teacher: text,
  address: text,
  show: z.enum(STUDENT_SHOW_OPTIONS).nullish().transform((v) => v ?? null),
});

const billingView = z.object({
  page: z.literal('billing'),
  label: z.string().trim().min(1).max(120),
  minOwed: money,
  maxOwed: money,
  status: z.enum(BILLING_STATUS_OPTIONS).nullish().transform((v) => v ?? null),
  family: text,
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullish()
  .transform((v) => v ?? null);

export const DESK_KIND_OPTIONS = ['late_arrival', 'early_pickup', 'nurse_visit'] as const;

const frontDeskView = z.object({
  page: z.literal('frontdesk'),
  label: z.string().trim().min(1).max(120),
  date: isoDate,
  tab: z.enum(['arrivals', 'nurse']).nullish().transform((v) => v ?? null),
  kind: z.enum(DESK_KIND_OPTIONS).nullish().transform((v) => v ?? null),
});

/** "not-present" = absent, late, or excused. */
export const ATTENDANCE_STATUS_OPTIONS = ['absent', 'late', 'excused', 'not-present'] as const;
export type OfficeAssistantAttendanceStatus = (typeof ATTENDANCE_STATUS_OPTIONS)[number];

const attendanceView = z.object({
  page: z.literal('attendance'),
  label: z.string().trim().min(1).max(120),
  date: isoDate,
  status: z.enum(ATTENDANCE_STATUS_OPTIONS).nullish().transform((v) => v ?? 'absent'),
  className: text,
});

export const officeAssistantViewSchema = z.discriminatedUnion('page', [
  studentsView,
  billingView,
  frontDeskView,
  attendanceView,
]);
export type OfficeAssistantView = z.infer<typeof officeAssistantViewSchema>;

/** What the AI returns: a view to show, or "this needs a written answer". */
export type OfficeAssistantDecision = { type: 'view'; view: OfficeAssistantView } | { type: 'answer' };

/** Validates the AI's JSON; anything unexpected falls back to a written answer. */
export function parseOfficeAssistantDecision(raw: unknown): OfficeAssistantDecision {
  if (!raw || typeof raw !== 'object') return { type: 'answer' };
  const obj = raw as Record<string, unknown>;
  if (obj.type !== 'view') return { type: 'answer' };
  const parsed = officeAssistantViewSchema.safeParse(obj.view);
  if (!parsed.success) return { type: 'answer' };
  const view = parsed.data;
  // A view with no filter at all isn't worth jumping to — answer in words instead.
  const hasFilter =
    view.page === 'students'
      ? !!(
          view.text ||
          view.lastNameStarts ||
          view.firstNameStarts ||
          view.birthMonth ||
          view.className ||
          view.teacher ||
          view.address ||
          view.show
        )
      : view.page === 'billing'
        ? view.minOwed != null || view.maxOwed != null || !!view.status || !!view.family
        : true;
  return hasFilter ? { type: 'view', view } : { type: 'answer' };
}

/** Link that opens the page with the view's filters (and the description for the "Showing" note). */
export function officeAssistantViewHref(schoolId: string, view: OfficeAssistantView, today?: string): string {
  const params = new URLSearchParams();
  params.set('ask', describeOfficeAssistantView(view, today));
  if (view.page === 'students') {
    if (view.text) params.set('q', view.text);
    if (view.lastNameStarts) params.set('lastStarts', view.lastNameStarts);
    if (view.firstNameStarts) params.set('firstStarts', view.firstNameStarts);
    if (view.birthMonth) params.set('birthMonth', String(view.birthMonth));
    if (view.className) params.set('className', view.className);
    if (view.teacher) params.set('teacher', view.teacher);
    if (view.address) params.set('address', view.address);
    if (view.show) params.set('filter', view.show);
    return `${officePublicHref(schoolId, 'students')}?${params.toString()}`;
  }
  if (view.page === 'billing') {
    if (view.minOwed != null) params.set('minOwed', String(view.minOwed));
    if (view.maxOwed != null) params.set('maxOwed', String(view.maxOwed));
    if (view.status) params.set('filter', view.status);
    if (view.family) params.set('q', view.family);
    return `${officePublicHref(schoolId, 'billing')}?${params.toString()}`;
  }
  if (view.page === 'attendance') {
    if (view.date) params.set('date', view.date);
    params.set('status', view.status);
    if (view.className) params.set('className', view.className);
    return `${officePublicHref(schoolId, 'attendance')}?${params.toString()}`;
  }
  if (view.date) params.set('date', view.date);
  const tab = view.kind ? (view.kind === 'nurse_visit' ? 'nurse' : 'arrivals') : view.tab;
  if (tab) params.set('tab', tab);
  if (view.kind) params.set('kind', view.kind);
  return `${officePublicHref(schoolId, 'front-desk')}?${params.toString()}`;
}

const STUDENT_SHOW_LABEL: Record<(typeof STUDENT_SHOW_OPTIONS)[number], string> = {
  'missing-grades': 'Students missing grades',
  'no-billing': 'Students with no billing account',
  unassigned: 'Students with no class',
  'no-teacher': 'Students with no teacher',
  'no-family': 'Students with no family linked',
  allergies: 'Students with allergies',
  withdrawn: 'Withdrawn students',
  graduated: 'Graduated students',
};

const DESK_KIND_LABEL: Record<(typeof DESK_KIND_OPTIONS)[number], string> = {
  late_arrival: 'Late arrivals',
  early_pickup: 'Early pickups',
  nurse_visit: 'Nurse visits',
};

const ATTENDANCE_STATUS_LABEL: Record<OfficeAssistantAttendanceStatus, string> = {
  absent: 'Students marked absent',
  late: 'Students marked late',
  excused: 'Students marked excused',
  'not-present': 'Students absent, late or excused',
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function describeDay(date: string | null, today?: string): string {
  if (!date || date === today) return 'today';
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? `on ${date}`
    : `on ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
}

function dollars(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/**
 * What the list actually shows, written from the filters the app applies — not the AI's own
 * wording — so a filter that doesn't match the question is obvious in the chat and the banner.
 */
export function describeOfficeAssistantView(view: OfficeAssistantView, today?: string): string {
  const parts: string[] = [];
  if (view.page === 'students') {
    const base = view.show ? STUDENT_SHOW_LABEL[view.show] : 'Students';
    if (view.className) parts.push(`in ${view.className}`);
    if (view.lastNameStarts) parts.push(`with last name starting with “${view.lastNameStarts}”`);
    if (view.firstNameStarts) parts.push(`with first name starting with “${view.firstNameStarts}”`);
    if (view.birthMonth) parts.push(`with a birthday in ${MONTH_NAMES[view.birthMonth - 1]}`);
    if (view.text) parts.push(`whose name or class includes “${view.text}”`);
    if (view.teacher) parts.push(`taught by a teacher named “${view.teacher}”`);
    if (view.address) parts.push(`whose home address includes “${view.address}”`);
    return [base, parts.join(', ')].filter(Boolean).join(' ');
  }
  if (view.page === 'billing') {
    if (view.minOwed != null) parts.push(`owing more than ${dollars(view.minOwed)}`);
    if (view.maxOwed != null) parts.push(`owing less than ${dollars(view.maxOwed)}`);
    if (view.status === 'overdue') parts.push('with an overdue bill');
    if (view.status === 'due-soon') parts.push('with a bill due soon');
    if (view.status === 'open') parts.push('with an unpaid bill');
    if (view.family) parts.push(`matching “${view.family}”`);
    return ['Families', parts.join(', ')].filter(Boolean).join(' ');
  }
  if (view.page === 'attendance') {
    const base = ATTENDANCE_STATUS_LABEL[view.status];
    return [base, view.className ? `in ${view.className}` : '', describeDay(view.date, today)].filter(Boolean).join(' ');
  }
  const base = view.kind
    ? DESK_KIND_LABEL[view.kind]
    : view.tab === 'nurse'
      ? 'Nurse visits'
      : 'Late arrivals and early pickups';
  return `${base} ${describeDay(view.date, today)}`;
}

export const OFFICE_ASSISTANT_PAGE_LABEL: Record<OfficeAssistantView['page'], string> = {
  students: 'Students',
  billing: 'Billing',
  frontdesk: 'Front desk',
  attendance: 'Attendance',
};

/** Finds the class a question named: exact name first, then a name that contains it. */
export function findClassByAskedName<T extends { name?: string | null }>(classes: T[], asked: string | null | undefined): T | undefined {
  const want = asked?.trim().toLowerCase();
  if (!want) return undefined;
  return (
    classes.find((c) => (c.name ?? '').trim().toLowerCase() === want) ??
    classes.find((c) => (c.name ?? '').toLowerCase().includes(want))
  );
}

/** Reads a dollar amount from the address (e.g. "100" or "99.50") as cents. */
export function dollarsParamToCents(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Instructions for the AI: turn a question into one view, or say it needs a written answer. */
export function officeAssistantSystemPrompt(params: {
  today: string;
  classNames: string[];
  /** The list on screen from the last question, so a follow-up can narrow or change it. */
  previous?: OfficeAssistantView | null;
}): string {
  return [
    'You turn a school office staff member\'s question into a filtered list the app can show.',
    'Reply with JSON only, in one of these two shapes:',
    '{"type":"answer"}  — for how-to questions, opinions, or anything that is not a request to list/find/show records.',
    '{"type":"view","view":{...}} — when they want to see, list, find, or count records the app can filter.',
    '',
    'Views (use null for anything not asked for; never invent names):',
    '1. Students: {"page":"students","label":"...","text":null|"part of a student name","lastNameStarts":null|"letters","firstNameStarts":null|"letters","birthMonth":null|1-12,"className":null|"class name","teacher":null|"teacher name","address":null|"town, street or zip","show":null|"missing-grades"|"no-billing"|"unassigned"|"no-teacher"|"no-family"|"allergies"|"withdrawn"|"graduated"}',
    '   - "last name starts with L" → lastNameStarts "L". "first name begins with Sh" → firstNameStarts "Sh". Never put a single letter in "text".',
    '   - "birthMonth": null|1-12 — "birthdays in March" → 3; "birthdays this month" → the current month.',
    '   - "unassigned" = students with no class. "address" matches the family home address (e.g. a town like Brooklyn).',
    '   - "text" is only for part of a student\'s name. Never put other words in it (not "absent", "late", "sick", "new", etc.).',
    '2. Billing (family accounts): {"page":"billing","label":"...","minOwed":null|dollars,"maxOwed":null|dollars,"status":null|"open"|"overdue"|"due-soon","family":null|"family name"}',
    '   - "owes more than $100" → minOwed 100. "owes less than $50" → maxOwed 50 and status "open".',
    '3. Front desk log: {"page":"frontdesk","label":"...","date":null|"YYYY-MM-DD","tab":null|"arrivals"|"nurse","kind":null|"late_arrival"|"early_pickup"|"nurse_visit"}',
    '   - arrivals = late arrivals and early pickups; nurse = nurse visits. Use "kind" when they ask about only one of them (e.g. who left early → early_pickup).',
    '4. Attendance for one day (all classes unless one is named): {"page":"attendance","label":"...","date":null|"YYYY-MM-DD","status":"absent"|"late"|"excused"|"not-present","className":null|"class name"}',
    '   - "who is absent today" → status "absent". "not-present" = absent, late or excused.',
    'If they ask for a list of something none of these views cover (for example teacher absences), reply {"type":"answer"}.',
    'Only use a filter that means exactly what they asked. Never swap in a looser or different filter to get close (for example, a name search for a letter when they asked about how names start). If no filter fits exactly, reply {"type":"answer"}.',
    '',
    '"label" is a short plain description of the list, e.g. "Families owing more than $100".',
    `Today is ${params.today}. Use it for words like today or yesterday.`,
    params.classNames.length
      ? `The school's classes are: ${params.classNames.join(', ')}. Use the exact class name when one is meant.`
      : 'The school has no classes yet.',
    ...(params.previous
      ? [
          '',
          `The list on screen now came from this view: ${JSON.stringify(params.previous)}`,
          'If the new question changes or narrows that list (e.g. "only grade 8", "what about over $500", "and yesterday?", "now just the late ones"), reply with that same view changed accordingly — keep its other filters — and a new label describing the whole list.',
          'If the new question is about something else, ignore the list on screen.',
        ]
      : []),
  ].join('\n');
}
