import { describe, expect, it } from 'vitest';
import { normalizeSchoolId, studentKioskLoginCredentials, isInvalidSchoolPathSegment } from './schoolId';

describe('normalizeSchoolId', () => {
  it('accepts valid school ids', () => {
    expect(normalizeSchoolId('schoolabc')).toBe('schoolabc');
    expect(normalizeSchoolId(' SchoolABC ')).toBe('schoolabc');
  });

  it('rejects nullish and legacy system tokens', () => {
    expect(normalizeSchoolId(null)).toBe('');
    expect(normalizeSchoolId(undefined)).toBe('');
    expect(normalizeSchoolId('null')).toBe('');
    expect(normalizeSchoolId('undefined')).toBe('');
    expect(normalizeSchoolId('')).toBe('');
  });
});

describe('isInvalidSchoolPathSegment', () => {
  it('flags null and undefined path segments', () => {
    expect(isInvalidSchoolPathSegment('null')).toBe(true);
    expect(isInvalidSchoolPathSegment('undefined')).toBe(true);
    expect(isInvalidSchoolPathSegment('schoolabc')).toBe(false);
  });
});

describe('studentKioskLoginCredentials', () => {
  it('includes demo passcode for sample schools', () => {
    expect(studentKioskLoginCredentials('schoolabc')).toEqual({
      schoolId: 'schoolabc',
      passcode: '1234',
    });
  });

  it('omits passcode for regular schools', () => {
    expect(studentKioskLoginCredentials('my-school')).toEqual({ schoolId: 'my-school' });
  });
});
