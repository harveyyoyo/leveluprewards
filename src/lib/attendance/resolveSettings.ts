/**
 * Pure attendance resolution (no Firebase). Used by the student app and mirrored in Cloud Functions.
 */

import { getSchoolDayClock } from '@/lib/attendance/schoolDayClock';

export interface AttendanceScheduleSlotLike {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

export interface AttendanceSettingsLike {
  pointsForSignIn: number;
  pointsForOnTime: number;
  onTimeWindowMinutes: number;
  enabledClassIds?: string[];
  classPeriodAssignments?: Record<string, string>;
  classPeriodAssignmentsByDay?: Record<string, Record<string, string>>;
  categoryId?: string;
  schedule: AttendanceScheduleSlotLike[];
  attendanceTimeZone?: string;
  teacherId?: string;
}

export interface StudentLike {
  id: string;
  classId?: string | null;
  firstName?: string;
  lastName?: string;
  nickname?: string | null;
}

export interface ClassLike {
  id: string;
  primaryTeacherId?: string | null;
}

export interface AttendanceRewardRuleLike {
  id: string;
  enabled: boolean;
  classId: string;
  periodId?: string;
  customPeriod?: { label: string; startTime: string; endTime: string };
  pointsForSignIn: number;
  pointsForOnTime: number;
  onTimeWindowMinutes?: number;
  categoryId?: string;
}

export type AttendanceResolveSource = 'reward_rule' | 'teacher_legacy' | 'school_legacy' | 'default';

/**
 * Kept for backward compatibility with consumers that still switch on these
 * values. The resolver itself no longer returns failures — it falls back to
 * {@link DEFAULT_ATTENDANCE_SETTINGS} so the kiosk can always record attendance.
 */
export type AttendanceResolveFailureReason =
  | 'no_attendance_configuration'
  | 'no_periods_for_school_legacy';

export type ResolveAttendanceResult =
  | { ok: true; settings: AttendanceSettingsLike; source: AttendanceResolveSource }
  | { ok: false; reason: AttendanceResolveFailureReason };

/**
 * Built-in defaults used when nothing is configured at the school or teacher
 * level. Keeps attendance "just working" out of the box: +1 for signing in,
 * +5 bonus if inside the first 5 minutes of a scheduled period.
 */
export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettingsLike = {
  pointsForSignIn: 1,
  pointsForOnTime: 5,
  onTimeWindowMinutes: 5,
  schedule: [],
};

function toFiniteNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/**
 * True when the raw config doc has at least one *explicit* point field. An
 * empty placeholder doc (e.g. one that only stored a schedule or a teacherId)
 * must not shadow higher-precedence configuration with implicit zeros.
 */
function hasPointFields(raw: Record<string, unknown> | null | undefined): boolean {
  if (!raw) return false;
  const a = raw.pointsForSignIn;
  const b = raw.pointsForOnTime;
  const isNumeric = (v: unknown) =>
    typeof v === 'number' ? Number.isFinite(v) : typeof v === 'string' ? Number.isFinite(Number(v)) : false;
  return isNumeric(a) || isNumeric(b);
}

function resolveRulePeriod(
  rule: AttendanceRewardRuleLike,
  periods: AttendanceScheduleSlotLike[]
): { label: string; startTime: string; endTime: string } | null {
  if (rule.customPeriod) return rule.customPeriod;
  const slot = periods.find((p) => p.id === rule.periodId);
  return slot ? { label: slot.label, startTime: slot.startTime, endTime: slot.endTime } : null;
}

function normalizeConfig(
  raw: Record<string, unknown> | null | undefined,
): Omit<AttendanceSettingsLike, 'teacherId'> | null {
  if (!hasPointFields(raw)) return null;
  const r = raw as Record<string, unknown>;
  const enabledClassIds = Array.isArray(r.enabledClassIds) ? (r.enabledClassIds as string[]) : undefined;
  return {
    pointsForSignIn: toFiniteNumber(r.pointsForSignIn, DEFAULT_ATTENDANCE_SETTINGS.pointsForSignIn),
    pointsForOnTime: toFiniteNumber(r.pointsForOnTime, DEFAULT_ATTENDANCE_SETTINGS.pointsForOnTime),
    onTimeWindowMinutes: toFiniteNumber(r.onTimeWindowMinutes, DEFAULT_ATTENDANCE_SETTINGS.onTimeWindowMinutes),
    enabledClassIds: enabledClassIds?.length ? enabledClassIds : undefined,
    classPeriodAssignments:
      r.classPeriodAssignments && typeof r.classPeriodAssignments === 'object'
        ? (r.classPeriodAssignments as Record<string, string>)
        : undefined,
    classPeriodAssignmentsByDay:
      r.classPeriodAssignmentsByDay && typeof r.classPeriodAssignmentsByDay === 'object'
        ? (r.classPeriodAssignmentsByDay as Record<string, Record<string, string>>)
        : undefined,
    categoryId: typeof r.categoryId === 'string' ? r.categoryId : undefined,
    schedule: Array.isArray(r.schedule) ? (r.schedule as AttendanceScheduleSlotLike[]) : [],
    attendanceTimeZone:
      typeof r.attendanceTimeZone === 'string' && String(r.attendanceTimeZone).trim()
        ? String(r.attendanceTimeZone).trim()
        : undefined,
  };
}

function normalizeTeacherConfig(
  raw: Record<string, unknown> | null | undefined,
  teacherId: string,
): AttendanceSettingsLike | null {
  const base = normalizeConfig(raw);
  return base ? { ...base, teacherId } : null;
}

function normalizeSchoolConfig(raw: Record<string, unknown> | null | undefined): AttendanceSettingsLike | null {
  return normalizeConfig(raw);
}

export interface ResolveAttendanceSettingsInput {
  nowMs: number;
  student: StudentLike;
  classes: ClassLike[];
  periods: AttendanceScheduleSlotLike[];
  teacherRewards: AttendanceRewardRuleLike[];
  teacherConfigRaw: Record<string, unknown> | null | undefined;
  schoolConfigRaw: Record<string, unknown> | null | undefined;
}

export function resolveAttendanceSettingsForSignIn(input: ResolveAttendanceSettingsInput): ResolveAttendanceResult {
  const { nowMs, student, classes, periods, teacherRewards, teacherConfigRaw, schoolConfigRaw } = input;
  const studentClassId = (student.classId || '').trim();
  const classForStudent = studentClassId ? classes.find((c) => c.id === studentClassId) : undefined;
  const teacherId = (classForStudent?.primaryTeacherId || '').trim() || undefined;

  const schoolTimeZone =
    schoolConfigRaw && typeof schoolConfigRaw['attendanceTimeZone'] === 'string'
      ? String(schoolConfigRaw['attendanceTimeZone'] as string).trim() || undefined
      : undefined;

  const withSchoolTz = (s: AttendanceSettingsLike): AttendanceSettingsLike =>
    schoolTimeZone ? { ...s, attendanceTimeZone: schoolTimeZone } : { ...s, attendanceTimeZone: s.attendanceTimeZone };

  const nowMinutes = getSchoolDayClock(nowMs, schoolTimeZone, { whenUnset: 'utc' }).minutesSinceMidnight;
  const parse = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const enabledRules = teacherRewards.filter((r) => r.enabled);
  const matchingRule = enabledRules.find((r) => {
    if (!studentClassId || r.classId !== studentClassId) return false;
    const period = resolveRulePeriod(r, periods);
    if (!period) return false;
    const start = parse(period.startTime);
    const end = parse(period.endTime);
    return nowMinutes >= start && nowMinutes <= end;
  });

  if (matchingRule && teacherId) {
    const period = resolveRulePeriod(matchingRule, periods);
    if (period) {
      const slotId = matchingRule.periodId || `custom_${matchingRule.id}`;
      const settings: AttendanceSettingsLike = {
        pointsForSignIn: matchingRule.pointsForSignIn,
        pointsForOnTime: matchingRule.pointsForOnTime,
        onTimeWindowMinutes: matchingRule.onTimeWindowMinutes ?? 15,
        enabledClassIds: [studentClassId],
        classPeriodAssignments: { [studentClassId]: slotId },
        schedule: [
          {
            id: slotId,
            label: period.label,
            startTime: period.startTime,
            endTime: period.endTime,
          },
        ],
        categoryId: matchingRule.categoryId,
        teacherId,
      };
      return { ok: true, settings: withSchoolTz(settings), source: 'reward_rule' };
    }
  }

  let legacy: AttendanceSettingsLike | null = null;
  let source: AttendanceResolveSource = 'default';

  if (teacherId) {
    const t = normalizeTeacherConfig(teacherConfigRaw, teacherId);
    if (t) {
      legacy = t;
      source = 'teacher_legacy';
    }
  }
  if (!legacy) {
    const s = normalizeSchoolConfig(schoolConfigRaw);
    if (s) {
      legacy = s;
      source = 'school_legacy';
    }
  }

  // Nothing configured anywhere — fall through to built-in defaults so the
  // kiosk can still record attendance and award the baseline point.
  if (!legacy) {
    legacy = teacherId
      ? { ...DEFAULT_ATTENDANCE_SETTINGS, teacherId }
      : { ...DEFAULT_ATTENDANCE_SETTINGS };
  }

  // Universal periods (when present) drive the on-time window for legacy /
  // default modes. When none are configured, the schedule is simply empty
  // and the on-time bonus doesn't fire — the baseline sign-in still does.
  const schedule = Array.isArray(periods) && periods.length > 0 ? periods : legacy.schedule ?? [];

  return { ok: true, settings: withSchoolTz({ ...legacy, schedule }), source };
}

export const ATTENDANCE_RESOLVE_FAILURE_MESSAGES: Record<AttendanceResolveFailureReason, string> = {
  no_attendance_configuration:
    'No attendance setup found. Add reward rules or legacy attendance config, and ensure universal periods exist for legacy mode.',
  no_periods_for_school_legacy:
    'Universal periods are missing. An admin should create periods in the Attendance tab before legacy attendance can run.',
};
