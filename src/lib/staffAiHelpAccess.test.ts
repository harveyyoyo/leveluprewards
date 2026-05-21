import { describe, expect, it } from 'vitest';
import { canAccessStaffAiHelp } from './staffAiHelpAccess';

describe('canAccessStaffAiHelp', () => {
  it('allows staff and developer roles', () => {
    expect(canAccessStaffAiHelp('admin')).toBe(true);
    expect(canAccessStaffAiHelp('teacher')).toBe(true);
    expect(canAccessStaffAiHelp('secretary')).toBe(true);
    expect(canAccessStaffAiHelp('developer')).toBe(true);
  });

  it('denies school portal and student sessions', () => {
    expect(canAccessStaffAiHelp('school')).toBe(false);
    expect(canAccessStaffAiHelp('student')).toBe(false);
    expect(canAccessStaffAiHelp('loggedOut')).toBe(false);
  });
});
