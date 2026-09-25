import { describe, expect, it } from 'vitest';
import type { AttendanceLogEntry, Student } from '@/lib/types';
import {
  attendanceMarkOf,
  csvCell,
  latestLogByStudent,
  recentSchoolDays,
  studentsForTeacher,
  summarizeAttendance,
} from './attendanceStatus';

const student = (id: string, classId = 'c1') => ({ id, firstName: id, classId }) as unknown as Student;
const log = (studentId: string, at: Date, extra: Partial<AttendanceLogEntry> = {}): AttendanceLogEntry => ({
  studentId,
  signedInAt: at.getTime(),
  pointsAwarded: 1,
  onTime: true,
  ...extra,
});

describe('attendanceMarkOf', () => {
  it('reads kiosk and staff statuses', () => {
    expect(attendanceMarkOf({ onTime: true })).toBe('on-time');
    expect(attendanceMarkOf({ onTime: false })).toBe('late');
    expect(attendanceMarkOf({ onTime: false, status: 'excused' })).toBe('excused');
    expect(attendanceMarkOf({ onTime: true, status: 'late' })).toBe('late');
  });
});

describe('latestLogByStudent', () => {
  it('keeps the newest check-in whatever the order', () => {
    const a = log('s1', new Date(2026, 8, 21, 8));
    const b = log('s1', new Date(2026, 8, 21, 10), { onTime: false });
    expect(latestLogByStudent([a, b]).get('s1')).toBe(b);
    expect(latestLogByStudent([b, a]).get('s1')).toBe(b);
  });
});

describe('recentSchoolDays', () => {
  it('skips weekends and ends on the given day', () => {
    // Thursday 24 Sep 2026
    const days = recentSchoolDays(new Date(2026, 8, 24), 5);
    expect(days.map((d) => d.key)).toEqual(['2026-09-18', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24']);
  });
});

describe('studentsForTeacher', () => {
  it('includes co-taught classes', () => {
    const classes = [
      { id: 'c1', name: 'A', primaryTeacherId: 't1' },
      { id: 'c2', name: 'B', teacherIds: ['t1', 't2'] },
      { id: 'c3', name: 'C', primaryTeacherId: 't3' },
    ];
    const list = [student('a', 'c1'), student('b', 'c2'), student('c', 'c3')];
    expect(studentsForTeacher(list, classes, 't1').map((s) => s.id)).toEqual(['a', 'b']);
    expect(studentsForTeacher(list, classes, undefined)).toHaveLength(3);
  });
});

describe('summarizeAttendance', () => {
  const days = recentSchoolDays(new Date(2026, 8, 24), 5);
  const students = [student('amy'), student('ben')];
  const at = (day: number, h = 8) => new Date(2026, 8, day, h);

  it('counts days in, late, missed, and skips days with no check-ins', () => {
    const logs = [
      log('amy', at(21)),
      log('amy', at(22), { onTime: false }),
      log('amy', at(23)),
      log('ben', at(21)),
      log('ben', at(22), { status: 'excused', onTime: false }),
      // 18th and 24th: nobody checked in (e.g. a day off) — not counted against anyone.
    ];
    const { daily, students: trends, schoolDays } = summarizeAttendance(logs, students, days);
    expect(schoolDays).toBe(3);
    expect(daily.find((d) => d.key === '2026-09-23')).toMatchObject({ present: 1, missing: 1 });
    expect(daily.find((d) => d.key === '2026-09-24')).toMatchObject({ present: 0, missing: 0 });

    const amy = trends.find((t) => t.student.id === 'amy')!;
    expect(amy).toMatchObject({ daysIn: 3, late: 1, missed: 0, rate: 100, needsAttention: false });
    const ben = trends.find((t) => t.student.id === 'ben')!;
    expect(ben).toMatchObject({ daysIn: 2, excused: 1, missed: 1, rate: 67, needsAttention: true });
  });

  it('uses the best mark when a student checks in more than once a day', () => {
    const logs = [log('amy', at(21, 8), { onTime: false }), log('amy', at(21, 10))];
    const { students: trends } = summarizeAttendance(logs, students, days);
    expect(trends[0].late).toBe(0);
  });
});

describe('csvCell', () => {
  it('quotes values and neutralises spreadsheet formulas', () => {
    expect(csvCell('Ana "AJ" Diaz')).toBe('"Ana ""AJ"" Diaz"');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
  });
});
