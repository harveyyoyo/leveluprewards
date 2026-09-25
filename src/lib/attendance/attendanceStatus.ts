import type { AttendanceLogEntry, Class, Student } from '@/lib/types';

export type AttendanceMark = 'on-time' | 'late' | 'excused';

/** One status per check-in. `status` (manual / edited) wins over the kiosk's on-time flag. */
export function attendanceMarkOf(log: Pick<AttendanceLogEntry, 'onTime' | 'status'>): AttendanceMark {
  if (log.status === 'excused') return 'excused';
  if (log.status === 'late' || log.onTime === false) return 'late';
  return 'on-time';
}

export const ATTENDANCE_MARK_LABEL: Record<AttendanceMark | 'absent', string> = {
  'on-time': 'On time',
  late: 'Late',
  excused: 'Excused',
  absent: 'Not in yet',
};

export function studentDisplayName(s: Pick<Student, 'firstName' | 'lastName' | 'nickname' | 'id'>): string {
  return [s.firstName, s.lastName].filter(Boolean).join(' ') || s.nickname || s.id;
}

/** Students in classes the teacher is assigned to (primary or co-teacher). */
export function studentsForTeacher(students: Student[], classes: Class[], teacherId: string | undefined): Student[] {
  if (!teacherId) return students;
  const classIds = new Set(
    classes
      .filter((c) => c.primaryTeacherId === teacherId || c.teacherIds?.includes(teacherId))
      .map((c) => c.id),
  );
  return students.filter((s) => s.classId && classIds.has(s.classId));
}

export function classesForTeacher(classes: Class[], teacherId: string | undefined): Class[] {
  if (!teacherId) return classes;
  return classes.filter((c) => c.primaryTeacherId === teacherId || c.teacherIds?.includes(teacherId));
}

/** Latest check-in per student (logs may arrive in any order). */
export function latestLogByStudent(logs: AttendanceLogEntry[]): Map<string, AttendanceLogEntry> {
  const map = new Map<string, AttendanceLogEntry>();
  for (const log of logs) {
    if (!log.studentId) continue;
    const prev = map.get(log.studentId);
    if (!prev || Number(log.signedInAt || 0) > Number(prev.signedInAt || 0)) map.set(log.studentId, log);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Trends over a range of school days
// ---------------------------------------------------------------------------

export interface AttendanceDay {
  /** `YYYY-MM-DD` */
  key: string;
  startMs: number;
  endMs: number;
}

/** The last `count` weekdays ending on `endDay` (inclusive), oldest first, on this device's calendar. */
export function recentSchoolDays(endDay: Date, count: number, includeWeekends = false): AttendanceDay[] {
  const days: AttendanceDay[] = [];
  const cursor = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate());
  let guard = 0;
  while (days.length < count && guard < count * 3 + 7) {
    guard += 1;
    const dow = cursor.getDay();
    if (includeWeekends || (dow !== 0 && dow !== 6)) {
      const start = cursor.getTime();
      const end = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1).getTime() - 1;
      days.unshift({ key: localDayKey(cursor), startMs: start, endMs: end });
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}

export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface DailyTotals {
  key: string;
  present: number;
  late: number;
  excused: number;
  /** Students with no check-in that day. */
  missing: number;
}

export interface StudentTrend {
  student: Student;
  daysIn: number;
  late: number;
  excused: number;
  missed: number;
  /** 0–100, share of counted days the student checked in (excused counts as in). */
  rate: number;
  /** Many misses or lates — worth a check-in with the family. */
  needsAttention: boolean;
}

/**
 * Per-day and per-student attendance over `days`. A day with no check-ins at all
 * (holiday, snow day, kiosk off) is left out so it doesn't mark everyone absent.
 */
export function summarizeAttendance(
  logs: AttendanceLogEntry[],
  students: Student[],
  days: AttendanceDay[],
): { daily: DailyTotals[]; students: StudentTrend[]; schoolDays: number } {
  const studentIds = new Set(students.map((s) => s.id));
  const byDay = new Map<string, Map<string, AttendanceMark>>();
  for (const day of days) byDay.set(day.key, new Map());

  for (const log of logs) {
    if (!studentIds.has(log.studentId)) continue;
    const t = Number(log.signedInAt || 0);
    const day = days.find((d) => t >= d.startMs && t <= d.endMs);
    if (!day) continue;
    const marks = byDay.get(day.key)!;
    const mark = attendanceMarkOf(log);
    const prev = marks.get(log.studentId);
    // A student's best mark of the day counts (on time in any period beats a late one).
    if (!prev || rank(mark) < rank(prev)) marks.set(log.studentId, mark);
  }

  const countedDays = days.filter((d) => (byDay.get(d.key)?.size ?? 0) > 0);

  const daily: DailyTotals[] = days.map((d) => {
    const marks = byDay.get(d.key)!;
    let late = 0;
    let excused = 0;
    marks.forEach((m) => {
      if (m === 'late') late += 1;
      else if (m === 'excused') excused += 1;
    });
    return {
      key: d.key,
      present: marks.size,
      late,
      excused,
      missing: marks.size > 0 ? Math.max(0, students.length - marks.size) : 0,
    };
  });

  const trends: StudentTrend[] = students.map((student) => {
    let daysIn = 0;
    let late = 0;
    let excused = 0;
    for (const d of countedDays) {
      const m = byDay.get(d.key)!.get(student.id);
      if (!m) continue;
      daysIn += 1;
      if (m === 'late') late += 1;
      if (m === 'excused') excused += 1;
    }
    const total = countedDays.length;
    const missed = total - daysIn;
    const rate = total > 0 ? Math.round((daysIn / total) * 100) : 0;
    const needsAttention = total >= 3 && (rate < 90 || late >= Math.max(3, Math.ceil(total / 3)));
    return { student, daysIn, late, excused, missed, rate, needsAttention };
  });

  return { daily, students: trends, schoolDays: countedDays.length };
}

function rank(m: AttendanceMark): number {
  return m === 'on-time' ? 0 : m === 'excused' ? 1 : 2;
}

/** Plain CSV cell: quotes, doubled inner quotes, and no leading formula characters. */
export function csvCell(value: unknown): string {
  let s = String(value ?? '');
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
