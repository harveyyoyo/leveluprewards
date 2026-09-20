import { describe, expect, it } from 'vitest';
import { classroomDeskContextAction } from './classroomDeskClick';

describe('classroomDeskContextAction', () => {
  it('opens the awards menu on right-click during Instant Award', () => {
    expect(
      classroomDeskContextAction({
        takingAttendance: false,
        hasDeskMenu: true,
        hasAttendanceOverride: true,
      }),
    ).toBe('menu');
  });

  it('keeps right-click for attendance while taking attendance', () => {
    expect(
      classroomDeskContextAction({
        takingAttendance: true,
        hasDeskMenu: true,
        hasAttendanceOverride: true,
      }),
    ).toBe('attendance');
  });

  it('does nothing when the desk has no menu and no attendance action', () => {
    expect(
      classroomDeskContextAction({
        takingAttendance: false,
        hasDeskMenu: false,
        hasAttendanceOverride: false,
      }),
    ).toBe('none');
  });
});
