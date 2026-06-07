import { describe, expect, it } from 'vitest';
import {
  isJewishOrthodoxSchool,
  isSchoolProfileType,
  normalizeSchoolProfile,
} from './schoolProfile';

describe('schoolProfile', () => {
  it('recognizes valid profile types', () => {
    expect(isSchoolProfileType('standard')).toBe(true);
    expect(isSchoolProfileType('jewish_orthodox')).toBe(true);
    expect(isSchoolProfileType('other')).toBe(false);
  });

  it('normalizes unknown profiles to standard', () => {
    expect(normalizeSchoolProfile(undefined)).toBe('standard');
    expect(normalizeSchoolProfile('jewish_orthodox')).toBe('jewish_orthodox');
  });

  it('uses stored profile when present', () => {
    expect(isJewishOrthodoxSchool({ schoolProfile: 'jewish_orthodox' }, 'schoolabc')).toBe(true);
    expect(isJewishOrthodoxSchool({ schoolProfile: 'standard' }, 'yeshiva')).toBe(false);
  });

  it('falls back to known demo school ids', () => {
    expect(isJewishOrthodoxSchool({}, 'yeshiva')).toBe(true);
    expect(isJewishOrthodoxSchool(null, 'schoolabc')).toBe(false);
  });
});
