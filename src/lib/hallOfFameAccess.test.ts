import { describe, expect, it } from 'vitest';
import { canAccessHallOfFameRoute, canReadSchoolRoster } from './hallOfFameAccess';

describe('canAccessHallOfFameRoute', () => {
  it('allows staff login states and developer', () => {
    expect(canAccessHallOfFameRoute('teacher')).toBe(true);
    expect(canAccessHallOfFameRoute('admin')).toBe(true);
    expect(canAccessHallOfFameRoute('developer')).toBe(true);
    expect(canAccessHallOfFameRoute('student')).toBe(false);
    expect(canAccessHallOfFameRoute('school')).toBe(false);
  });
});

describe('canReadSchoolRoster', () => {
  it('allows a real teacher role even if loginState looks stale', () => {
    expect(canReadSchoolRoster({ loginState: 'school', isTeacher: true })).toBe(true);
  });

  it('allows admin only when the admin role flag is set', () => {
    expect(canReadSchoolRoster({ loginState: 'admin', isAdmin: true })).toBe(true);
    expect(canReadSchoolRoster({ loginState: 'admin', isAdmin: false })).toBe(false);
  });

  it('blocks leftover developer UI with a custom token and no email', () => {
    expect(canReadSchoolRoster({ loginState: 'developer' })).toBe(false);
    expect(canReadSchoolRoster({ loginState: 'developer', email: '   ' })).toBe(false);
    expect(canReadSchoolRoster({ loginState: 'developer', email: 'dev@example.com' })).toBe(true);
  });
});
