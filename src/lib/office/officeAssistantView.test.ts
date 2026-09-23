import { describe, expect, it } from 'vitest';
import {
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

describe('officeAssistantViewHref', () => {
  it('builds a Students link with the address filter and label', () => {
    const href = officeAssistantViewHref('schoolabc', {
      page: 'students',
      label: 'Students living in Brooklyn',
      text: null,
      className: null,
      teacher: null,
      address: 'Brooklyn',
      show: null,
    });
    expect(href).toContain('/students?');
    expect(href).toContain('address=Brooklyn');
    expect(href).toContain('ask=Students+living+in+Brooklyn');
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
