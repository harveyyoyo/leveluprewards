import type { TodayAttendanceStatus } from '@/hooks/useTodayAttendanceMap';

export type ClassroomRollMark = 'unmarked' | 'present' | 'absent' | 'late';

export function resolveClassroomRollMark(
  saved: TodayAttendanceStatus | undefined,
  override?: ClassroomRollMark,
): ClassroomRollMark {
  if (override) return override;
  if (saved === 'on-time') return 'present';
  if (saved === 'late') return 'late';
  return 'unmarked';
}

/** Single tap: Present ↔ Absent. Late and unmarked become Present. */
export function nextAttendanceClickMark(current: ClassroomRollMark): ClassroomRollMark {
  return current === 'present' ? 'absent' : 'present';
}

export function classroomRollToAttendanceStatus(mark: ClassroomRollMark): TodayAttendanceStatus {
  if (mark === 'present') return 'on-time';
  if (mark === 'absent') return 'absent';
  if (mark === 'late') return 'late';
  return 'unknown';
}

export function summarizeClassroomRoll(marks: ClassroomRollMark[]): {
  present: number;
  absent: number;
  late: number;
  unmarked: number;
} {
  let present = 0;
  let absent = 0;
  let late = 0;
  let unmarked = 0;
  for (const mark of marks) {
    if (mark === 'present') present += 1;
    else if (mark === 'absent') absent += 1;
    else if (mark === 'late') late += 1;
    else unmarked += 1;
  }
  return { present, absent, late, unmarked };
}

export function formatClassroomRollSummary(summary: {
  present: number;
  absent: number;
  late: number;
}): string {
  return `${summary.present} Present · ${summary.absent} Absent · ${summary.late} Late`;
}

/** Students counted in the live “Here” chip: present or late. */
export function classroomStudentIsHere(status: TodayAttendanceStatus | undefined): boolean {
  return status === 'on-time' || status === 'late';
}

/** Same as the green/orange desk dots — manual roll or card scan both count. */
export function classroomStudentCanTakeHallPass(
  status: TodayAttendanceStatus | undefined,
): boolean {
  return classroomStudentIsHere(status);
}

/** Explicit absent, or unsigned-in when the class uses badge scan. */
export function classroomStudentIsAbsent(
  status: TodayAttendanceStatus | undefined,
  options?: { treatUnsignedAsAbsent?: boolean },
): boolean {
  if (status === 'absent') return true;
  if (options?.treatUnsignedAsAbsent && !classroomStudentIsHere(status)) return true;
  return false;
}

/** Random pick, Give everyone, groups, and burst skip absentees. */
export function seatedStudentsIncludedInClassAwards(
  seatedIds: readonly string[],
  attendanceByStudent: Map<string, TodayAttendanceStatus>,
  options: { attendanceEnabled: boolean; treatUnsignedAsAbsent?: boolean },
): string[] {
  const seated = seatedIds.filter(Boolean);
  if (!options.attendanceEnabled) return seated;
  return seated.filter(
    (id) =>
      !classroomStudentIsAbsent(attendanceByStudent.get(id), {
        treatUnsignedAsAbsent: options.treatUnsignedAsAbsent,
      }),
  );
}

/** Mark All Present: every seated student becomes present, including late and absent. */
export function markAllSeatedPresent(
  seatedIds: string[],
  current?: Record<string, Exclude<ClassroomRollMark, 'unmarked'>>,
): Record<string, Exclude<ClassroomRollMark, 'unmarked'>> {
  const next = { ...(current ?? {}) };
  for (const id of seatedIds) {
    if (!id) continue;
    next[id] = 'present';
  }
  return next;
}
