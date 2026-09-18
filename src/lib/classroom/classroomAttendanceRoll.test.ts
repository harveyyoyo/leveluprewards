import { describe, expect, it } from 'vitest';
import {
  classroomRollToAttendanceStatus,
  classroomStudentCanTakeHallPass,
  classroomStudentIsHere,
  formatClassroomRollSummary,
  markAllSeatedPresent,
  nextAttendanceClickMark,
  resolveClassroomRollMark,
  seatedStudentsIncludedInClassAwards,
  summarizeClassroomRoll,
} from './classroomAttendanceRoll';

describe('classroomAttendanceRoll', () => {
  it('keeps saved present/late unless the teacher overrides the roll', () => {
    expect(resolveClassroomRollMark('on-time')).toBe('present');
    expect(resolveClassroomRollMark('late')).toBe('late');
    expect(resolveClassroomRollMark('absent')).toBe('unmarked');
    expect(resolveClassroomRollMark('on-time', 'absent')).toBe('absent');
    expect(resolveClassroomRollMark(undefined, 'unmarked')).toBe('unmarked');
  });

  it('toggles present and absent on a single click', () => {
    expect(nextAttendanceClickMark('unmarked')).toBe('present');
    expect(nextAttendanceClickMark('present')).toBe('absent');
    expect(nextAttendanceClickMark('absent')).toBe('present');
    expect(nextAttendanceClickMark('late')).toBe('present');
  });

  it('counts a class roll for the sidebar', () => {
    const summary = summarizeClassroomRoll(['present', 'present', 'absent', 'late', 'unmarked']);
    expect(summary).toEqual({ present: 2, absent: 1, late: 1, unmarked: 1 });
    expect(formatClassroomRollSummary(summary)).toBe('2 Present · 1 Absent · 1 Late');
    expect(classroomRollToAttendanceStatus('present')).toBe('on-time');
    expect(classroomRollToAttendanceStatus('unmarked')).toBe('unknown');
  });

  it('marks every seated student present, including late', () => {
    expect(
      markAllSeatedPresent(['a', 'b', 'c'], { a: 'late', b: 'absent' }),
    ).toEqual({ a: 'present', b: 'present', c: 'present' });
  });

  it('leaves absentees out of random pick, give everyone, and groups', () => {
    const marks = new Map([
      ['maya', 'on-time' as const],
      ['sam', 'late' as const],
      ['lee', 'absent' as const],
    ]);
    expect(
      seatedStudentsIncludedInClassAwards(['maya', 'sam', 'lee', 'unmarked'], marks, {
        attendanceEnabled: true,
      }),
    ).toEqual(['maya', 'sam', 'unmarked']);
    expect(
      seatedStudentsIncludedInClassAwards(['maya', 'lee', 'unmarked'], marks, {
        attendanceEnabled: true,
        treatUnsignedAsAbsent: true,
      }),
    ).toEqual(['maya']);
    expect(classroomStudentIsHere('on-time')).toBe(true);
    expect(classroomStudentIsHere('absent')).toBe(false);
  });

  it('lets present and late students take a hall pass, and blocks red-dot absentees', () => {
    expect(classroomStudentCanTakeHallPass('on-time')).toBe(true);
    expect(classroomStudentCanTakeHallPass('late')).toBe(true);
    expect(classroomStudentCanTakeHallPass('absent')).toBe(false);
    expect(classroomStudentCanTakeHallPass('unknown')).toBe(false);
    expect(classroomStudentCanTakeHallPass(undefined)).toBe(false);
  });
});
