import { describe, expect, it } from 'vitest';
import {
  describeOfficeAssistantView,
  dollarsParamToCents,
  findClassByAskedName,
  officeAssistantSystemPrompt,
  officeAssistantViewHref,
  parseOfficeAssistantDecision,
} from '@/lib/office/officeAssistantView';

describe('parseOfficeAssistantDecision', () => {
  it('accepts a billing view for "owes more than $100"', () => {
    const d = parseOfficeAssistantDecision({
      type: 'view',
      view: { page: 'billing', label: 'Families owing more than $100', minOwed: 100, maxOwed: null, status: null, family: null },
    });
    expect(d).toEqual({
      type: 'view',
      view: { page: 'billing', label: 'Families owing more than $100', minOwed: 100, maxOwed: null, status: null, family: null },
    });
  });

  it('falls back to a written answer for anything malformed or unfiltered', () => {
    expect(parseOfficeAssistantDecision({ type: 'answer' })).toEqual({ type: 'answer' });
    expect(parseOfficeAssistantDecision({ type: 'view', view: { page: 'rocket', label: 'x' } })).toEqual({ type: 'answer' });
    expect(parseOfficeAssistantDecision({ type: 'view', view: { page: 'students', label: 'Everyone' } })).toEqual({ type: 'answer' });
    expect(parseOfficeAssistantDecision('nonsense')).toEqual({ type: 'answer' });
    expect(
      parseOfficeAssistantDecision({ type: 'view', view: { page: 'students', label: 'x', show: 'delete-everyone' } }),
    ).toEqual({ type: 'answer' });
  });
});

describe('student name filters', () => {
  it('reads "last name starts with L" as a starts-with filter, and never searches a single letter', () => {
    const d = parseOfficeAssistantDecision({
      type: 'view',
      view: { page: 'students', label: 'Last name L', lastNameStarts: 'L' },
    });
    if (d.type !== 'view' || d.view.page !== 'students') throw new Error('expected a students view');
    expect(d.view.lastNameStarts).toBe('L');
    expect(officeAssistantViewHref('schoolabc', d.view)).toContain('lastStarts=L');
    // A one-letter name search would match nearly everyone, so it's dropped (and with nothing
    // else asked, the question gets a written answer instead of a wrong list).
    expect(
      parseOfficeAssistantDecision({ type: 'view', view: { page: 'students', label: 'x', text: 'l' } }),
    ).toEqual({ type: 'answer' });
  });
});

describe('describeOfficeAssistantView', () => {
  it('describes the filters actually applied, not the AI wording', () => {
    const base = {
      page: 'students' as const,
      label: 'Students from Brooklyn',
      text: null,
      lastNameStarts: null,
      firstNameStarts: null,
      birthMonth: null,
      className: null,
      teacher: null,
      address: null,
      show: null,
    };
    expect(describeOfficeAssistantView({ ...base, lastNameStarts: 'L' })).toBe('Students with last name starting with “L”');
    expect(describeOfficeAssistantView({ ...base, show: 'allergies', className: 'Grade 7' })).toBe(
      'Students with allergies in Grade 7',
    );
    expect(describeOfficeAssistantView({ ...base, text: 'lo' })).toBe('Students whose name or class includes “lo”');
    expect(describeOfficeAssistantView({ ...base, birthMonth: 3 })).toBe('Students with a birthday in March');
    expect(
      describeOfficeAssistantView({ page: 'billing', label: 'x', minOwed: 1800, maxOwed: null, status: 'overdue', family: null }),
    ).toBe('Families owing more than $1,800, with an overdue bill');
    expect(
      describeOfficeAssistantView(
        { page: 'attendance', label: 'x', date: '2026-09-23', status: 'absent', className: null },
        '2026-09-23',
      ),
    ).toBe('Students marked absent today');
  });
});

describe('officeAssistantViewHref', () => {
  it('builds a Students link with the address filter and a description of it', () => {
    const href = officeAssistantViewHref('schoolabc', {
      page: 'students',
      label: 'Students living in Brooklyn',
      text: null,
      lastNameStarts: null,
      firstNameStarts: null,
      birthMonth: null,
      className: null,
      teacher: null,
      address: 'Brooklyn',
      show: null,
    });
    expect(href).toContain('/students?');
    expect(href).toContain('address=Brooklyn');
    expect(new URL(href, 'http://x').searchParams.get('ask')).toBe('Students whose home address includes “Brooklyn”');
  });

  it('builds a Billing link with the amount', () => {
    const href = officeAssistantViewHref('schoolabc', {
      page: 'billing',
      label: 'Families owing more than $100',
      minOwed: 100,
      maxOwed: null,
      status: null,
      family: null,
    });
    expect(href).toContain('/billing?');
    expect(href).toContain('minOwed=100');
  });

  it('opens the Transportation page for a bus question', () => {
    const decision = parseOfficeAssistantDecision({ type: 'view', view: { page: 'transportation', label: 'Live buses' } });
    expect(decision).toEqual({ type: 'view', view: { page: 'transportation', label: 'Live buses' } });
    if (decision.type !== 'view') throw new Error('expected a view');
    expect(officeAssistantViewHref('schoolabc', decision.view)).toContain('/transportation?');
  });
});

describe('attendance and front desk views', () => {
  it('reads "who is absent today" as an attendance list, absent by default', () => {
    const d = parseOfficeAssistantDecision({
      type: 'view',
      view: { page: 'attendance', label: 'Absent today', date: '2026-09-23', className: null },
    });
    expect(d).toEqual({
      type: 'view',
      view: { page: 'attendance', label: 'Absent today', date: '2026-09-23', status: 'absent', className: null },
    });
    if (d.type !== 'view') throw new Error('expected a view');
    const href = officeAssistantViewHref('schoolabc', d.view);
    expect(href).toContain('/attendance?');
    expect(href).toContain('status=absent');
    expect(href).toContain('date=2026-09-23');
  });

  it('opens the right front desk tab for one kind of entry', () => {
    const href = officeAssistantViewHref('schoolabc', {
      page: 'frontdesk',
      label: 'Left early today',
      date: null,
      tab: null,
      kind: 'early_pickup',
    });
    expect(href).toContain('tab=arrivals');
    expect(href).toContain('kind=early_pickup');
  });
});

describe('officeAssistantSystemPrompt', () => {
  it('includes the list on screen only when there is one, so follow-ups can narrow it', () => {
    const previous = {
      page: 'students' as const,
      label: 'Students with allergies',
      text: null,
      lastNameStarts: null,
      firstNameStarts: null,
      birthMonth: null,
      className: null,
      teacher: null,
      address: null,
      show: 'allergies' as const,
    };
    const withList = officeAssistantSystemPrompt({ today: '2026-09-23', classNames: ['Grade 5'], previous });
    expect(withList).toContain('"show":"allergies"');
    expect(withList).toContain('only grade 8');
    expect(officeAssistantSystemPrompt({ today: '2026-09-23', classNames: [] })).not.toContain('list on screen');
  });
});

describe('findClassByAskedName', () => {
  const classes = [{ name: 'Grade 5' }, { name: 'Grade 10' }, { name: 'Kindergarten A' }];
  it('prefers the exact class, then one that contains the words', () => {
    expect(findClassByAskedName(classes, 'grade 5')).toEqual({ name: 'Grade 5' });
    expect(findClassByAskedName(classes, 'kindergarten')).toEqual({ name: 'Kindergarten A' });
    expect(findClassByAskedName(classes, null)).toBeUndefined();
    expect(findClassByAskedName(classes, 'Grade 3')).toBeUndefined();
  });
});

describe('dollarsParamToCents', () => {
  it('reads dollars from the address', () => {
    expect(dollarsParamToCents('100')).toBe(10000);
    expect(dollarsParamToCents('99.5')).toBe(9950);
    expect(dollarsParamToCents('abc')).toBeNull();
    expect(dollarsParamToCents(null)).toBeNull();
  });
});
