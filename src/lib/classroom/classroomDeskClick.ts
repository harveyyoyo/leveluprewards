export type ClassroomDeskContextAction = 'none' | 'menu' | 'attendance';

/** Right-click on a student desk while teaching. */
export function classroomDeskContextAction(input: {
  takingAttendance: boolean;
  hasDeskMenu: boolean;
  hasAttendanceOverride: boolean;
}): ClassroomDeskContextAction {
  if (input.takingAttendance && input.hasAttendanceOverride) return 'attendance';
  if (input.hasDeskMenu) return 'menu';
  if (input.hasAttendanceOverride) return 'attendance';
  return 'none';
}
