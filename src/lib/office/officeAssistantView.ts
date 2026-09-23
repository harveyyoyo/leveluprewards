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

const studentsView = z.object({
  page: z.literal('students'),
  label: z.string().trim().min(1).max(120),
  text: text,
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

const frontDeskView = z.object({
  page: z.literal('frontdesk'),
  label: z.string().trim().min(1).max(120),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .transform((v) => v ?? null),
  tab: z.enum(['arrivals', 'nurse']).nullish().transform((v) => v ?? null),
});

export const officeAssistantViewSchema = z.discriminatedUnion('page', [studentsView, billingView, frontDeskView]);
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
      ? !!(view.text || view.className || view.teacher || view.address || view.show)
      : view.page === 'billing'
        ? view.minOwed != null || view.maxOwed != null || !!view.status || !!view.family
        : true;
  return hasFilter ? { type: 'view', view } : { type: 'answer' };
}

/** Link that opens the page with the view's filters (and the label for the "Showing" note). */
export function officeAssistantViewHref(schoolId: string, view: OfficeAssistantView): string {
  const params = new URLSearchParams();
  params.set('ask', view.label);
  if (view.page === 'students') {
    if (view.text) params.set('q', view.text);
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
  if (view.date) params.set('date', view.date);
  if (view.tab) params.set('tab', view.tab);
  return `${officePublicHref(schoolId, 'front-desk')}?${params.toString()}`;
}

export const OFFICE_ASSISTANT_PAGE_LABEL: Record<OfficeAssistantView['page'], string> = {
  students: 'Students',
  billing: 'Billing',
  frontdesk: 'Front desk',
};

/** Reads a dollar amount from the address (e.g. "100" or "99.50") as cents. */
export function dollarsParamToCents(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Instructions for the AI: turn a question into one view, or say it needs a written answer. */
export function officeAssistantSystemPrompt(params: { today: string; classNames: string[] }): string {
  return [
    'You turn a school office staff member\'s question into a filtered list the app can show.',
    'Reply with JSON only, in one of these two shapes:',
    '{"type":"answer"}  — for how-to questions, opinions, or anything that is not a request to list/find/show records.',
    '{"type":"view","view":{...}} — when they want to see, list, find, or count records the app can filter.',
    '',
    'Views (use null for anything not asked for; never invent names):',
    '1. Students: {"page":"students","label":"...","text":null|"part of a student name","className":null|"class name","teacher":null|"teacher name","address":null|"town, street or zip","show":null|"missing-grades"|"no-billing"|"unassigned"|"no-teacher"|"no-family"|"allergies"|"withdrawn"|"graduated"}',
    '   - "unassigned" = students with no class. "address" matches the family home address (e.g. a town like Brooklyn).',
    '2. Billing (family accounts): {"page":"billing","label":"...","minOwed":null|dollars,"maxOwed":null|dollars,"status":null|"open"|"overdue"|"due-soon","family":null|"family name"}',
    '   - "owes more than $100" → minOwed 100. "owes less than $50" → maxOwed 50 and status "open".',
    '3. Front desk log: {"page":"frontdesk","label":"...","date":null|"YYYY-MM-DD","tab":null|"arrivals"|"nurse"}',
    '   - arrivals = late arrivals and early pickups; nurse = nurse visits.',
    '',
    '"label" is a short plain description of the list, e.g. "Families owing more than $100".',
    `Today is ${params.today}. Use it for words like today or yesterday.`,
    params.classNames.length
      ? `The school's classes are: ${params.classNames.join(', ')}. Use the exact class name when one is meant.`
      : 'The school has no classes yet.',
  ].join('\n');
}
