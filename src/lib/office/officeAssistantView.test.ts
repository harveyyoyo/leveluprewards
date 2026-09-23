import { describe, expect, it } from 'vitest';
import {
  dollarsParamToCents,
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

describe('dollarsParamToCents', () => {
  it('reads dollars from the address', () => {
    expect(dollarsParamToCents('100')).toBe(10000);
    expect(dollarsParamToCents('99.5')).toBe(9950);
    expect(dollarsParamToCents('abc')).toBeNull();
    expect(dollarsParamToCents(null)).toBeNull();
  });
});
