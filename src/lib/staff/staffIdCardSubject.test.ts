import { describe, expect, it } from 'vitest';
import {
  allStaffIdCardSubjects,
  staffIdCardDisplayName,
  staffIdCardRoleLabel,
  staffIdCardScanCode,
} from './staffIdCardSubject';

describe('staffIdCardSubject', () => {
  it('builds teacher card metadata', () => {
    const subject = {
      kind: 'teacher' as const,
      teacher: { id: 't1', name: 'Jane Doe', personnelRole: 'principal' as const },
    };
    expect(staffIdCardDisplayName(subject)).toBe('Jane Doe');
    expect(staffIdCardRoleLabel(subject)).toBe('Principal');
    expect(staffIdCardScanCode(subject)).toBe('STF-t1');
  });

  it('builds desk staff card metadata', () => {
    const subject = {
      kind: 'staffAccount' as const,
      account: {
        id: 'sa1',
        username: 'desk1',
        passcode: '1234',
        displayName: 'Front Desk',
        role: 'secretary' as const,
      },
    };
    expect(staffIdCardDisplayName(subject)).toBe('Front Desk');
    expect(staffIdCardRoleLabel(subject)).toBe('Coupon printing');
    expect(staffIdCardScanCode(subject)).toBe('STF-sa1');
  });

  it('combines teachers and desk staff for bulk print', () => {
    const subjects = allStaffIdCardSubjects(
      [{ id: 't1', name: 'Teacher One' }],
      [{ id: 's1', username: 'a', passcode: '1', displayName: 'Desk', role: 'reports' }],
    );
    expect(subjects).toHaveLength(2);
  });
});
