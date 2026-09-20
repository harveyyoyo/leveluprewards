import { describe, expect, it } from 'vitest';
import { officeNavIdFromPath } from './officeNav';

describe('officeNavIdFromPath', () => {
  it('matches regardless of schoolId casing', () => {
    expect(officeNavIdFromPath('/SCHOOLABC/office/students', 'schoolabc')).toBe('students');
    expect(officeNavIdFromPath('/schoolabc/office/students', 'SCHOOLABC')).toBe('students');
  });

  it('matches regardless of route-segment casing (regression: rest was sliced from the original-case pathname)', () => {
    expect(officeNavIdFromPath('/schoolabc/office/Students', 'schoolabc')).toBe('students');
    expect(officeNavIdFromPath('/schoolabc/Grades', 'schoolabc')).toBe('grades');
  });

  it('falls back to home for unrecognized or unrelated paths', () => {
    expect(officeNavIdFromPath('/schoolabc/office', 'schoolabc')).toBe('home');
    expect(officeNavIdFromPath('/otherschool/office/students', 'schoolabc')).toBe('home');
  });
});
