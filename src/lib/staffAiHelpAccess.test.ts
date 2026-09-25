import { describe, expect, it } from 'vitest';
import { canAccessStaffAiHelp } from './staffAiHelpAccess';

describe('canAccessStaffAiHelp', () => {
  it('allows school login, staff, and developer roles', () => {
    expect(canAccessStaffAiHelp('school')).toBe(true);
    expect(canAccessStaffAiHelp('admin')).toBe(true);
    expect(canAccessStaffAiHelp('teacher')).toBe(true);
    expect(canAccessStaffAiHelp('secretary')).toBe(true);
    expect(canAccessStaffAiHelp('developer')).toBe(true);
  });

  it('denies student kiosk and logged out sessions', () => {
    expect(canAccessStaffAiHelp('student')).toBe(false);
    expect(canAccessStaffAiHelp('loggedOut')).toBe(false);
  });
});
