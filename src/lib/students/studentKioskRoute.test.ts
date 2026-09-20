import { describe, expect, it } from 'vitest';
import { studentKioskPath, isStudentKioskRoute, isStudentKioskUiContext } from './studentKioskRoute';

describe('studentKioskRoute', () => {
  it('hardwires the canonical student kiosk URL to /{schoolId}/student', () => {
    expect(studentKioskPath('schoolabc')).toBe('/schoolabc/student');
    expect(studentKioskPath('YESHIVA')).toBe('/yeshiva/student');
    expect(studentKioskPath(' my-school ')).toBe('/my-school/student');
  });

  it('matches student kiosk route correctly', () => {
    expect(isStudentKioskRoute('/schoolabc/student', 'schoolabc')).toBe(true);
    expect(isStudentKioskRoute('/schoolabc/student/welcome', 'schoolabc')).toBe(true);
    expect(isStudentKioskRoute('/schoolabc/portal', 'schoolabc')).toBe(false);
    expect(isStudentKioskRoute('/other/student', 'schoolabc')).toBe(false);
    expect(isStudentKioskRoute(null, 'schoolabc')).toBe(false);
    expect(isStudentKioskRoute('/schoolabc/student', null)).toBe(false);
  });

  it('identifies student UI context for school and student sessions', () => {
    expect(isStudentKioskUiContext('student', '/schoolabc/student', 'schoolabc')).toBe(true);
    expect(isStudentKioskUiContext('school', '/schoolabc/student', 'schoolabc')).toBe(true);
    expect(isStudentKioskUiContext('school', '/schoolabc/portal', 'schoolabc')).toBe(false);
    expect(isStudentKioskUiContext('loggedOut', '/schoolabc/student', 'schoolabc')).toBe(false);
  });
});
