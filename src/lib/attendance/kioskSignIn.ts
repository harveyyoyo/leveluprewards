import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import type {
  Student,
  Class,
  AttendanceScheduleSlot,
  AttendanceRewardRule,
  AttendanceSettings,
  AttendanceKioskSignInResult,
  RecordClassSignInResult,
} from '@/lib/types';
import {
  resolveAttendanceSettingsForSignIn,
  ATTENDANCE_RESOLVE_FAILURE_MESSAGES,
  type AttendanceResolveSource,
} from '@/lib/attendance/resolveSettings';

type CallablePayload = { schoolId: string; studentId: string };
type CallableResult = {
  pointsAwarded: number;
  onTime: boolean;
  periodLabel?: string | null;
  reason: string;
  serverTimeMs?: number;
  source?: string;
};

function mapServerReason(r: string): AttendanceKioskSignInResult['reason'] {
  switch (r) {
    case 'recorded':
    case 'duplicate_same_session':
    case 'class_not_in_enabled_list':
    case 'student_not_found':
    case 'no_attendance_configuration':
    case 'no_periods_for_school_legacy':
      return r;
    default:
      return 'callable_failed';
  }
}

export function describeAttendanceKioskOutcome(result: AttendanceKioskSignInResult): string {
  if (result.reason === 'recorded') {
    return result.pointsAwarded > 0
      ? `Recorded${result.onTime ? ' (on time)' : ''}: +${result.pointsAwarded} pts.`
      : 'No points this sign-in.';
  }
  if (result.reason === 'duplicate_same_session') {
    return 'Already checked in for this class period today.';
  }
  if (result.reason === 'class_not_in_enabled_list') {
    return 'This class is not included in attendance rewards.';
  }
  if (result.reason === 'student_not_found') {
    return 'Student record was not found.';
  }
  if (result.reason === 'no_attendance_configuration') {
    return ATTENDANCE_RESOLVE_FAILURE_MESSAGES.no_attendance_configuration;
  }
  if (result.reason === 'no_periods_for_school_legacy') {
    return ATTENDANCE_RESOLVE_FAILURE_MESSAGES.no_periods_for_school_legacy;
  }
  if (result.reason === 'callable_failed') {
    return 'Could not reach the attendance server; used on-device rules.';
  }
  return 'Attendance was not recorded.';
}

/**
 * Server-first attendance sign-in (Cloud Function), with the same resolver + Firestore path as fallback.
 */
export async function performKioskAttendanceSignIn(params: {
  firestore: Firestore;
  functions: Functions;
  schoolId: string;
  student: Student;
  classes: Class[];
  periods: AttendanceScheduleSlot[];
  teacherRewards: AttendanceRewardRule[];
  recordClassSignIn: (studentId: string, student: Student, config: AttendanceSettings) => Promise<RecordClassSignInResult>;
}): Promise<AttendanceKioskSignInResult> {
  const { firestore, functions, schoolId, student, classes, periods, teacherRewards, recordClassSignIn } = params;

  try {
    const fn = httpsCallable<CallablePayload, CallableResult>(functions, 'signInAttendance');
    const res = await fn({ schoolId, studentId: student.id });
    const data = res.data;
    return {
      pointsAwarded: data.pointsAwarded ?? 0,
      onTime: !!data.onTime,
      periodLabel: data.periodLabel ?? null,
      reason: mapServerReason(String(data.reason || 'recorded')),
      usedServer: true,
      serverTimeMs: data.serverTimeMs,
      source: data.source as AttendanceResolveSource | undefined,
    };
  } catch (err) {
    // Fall through to the client-side path so the kiosk can still record
    // attendance when the callable is unreachable, but surface the reason so
    // deploy / auth / permission issues don't silently degrade to "0 points".
    // eslint-disable-next-line no-console
    console.warn('[attendance] signInAttendance callable failed, using client fallback:', err);
  }

  const classForStudent = student.classId ? classes.find((c) => c.id === student.classId) : undefined;
  const teacherId = classForStudent?.primaryTeacherId?.trim();

  const schoolSnap = await getDoc(doc(firestore, 'schools', schoolId, 'attendance', 'config'));
  const teacherSnap = teacherId
    ? await getDoc(doc(firestore, 'schools', schoolId, 'teachers', teacherId, 'attendanceConfig', 'config'))
    : null;

  const resolved = resolveAttendanceSettingsForSignIn({
    nowMs: Date.now(),
    student,
    classes,
    periods,
    teacherRewards,
    teacherConfigRaw: teacherSnap?.exists() ? (teacherSnap.data() as Record<string, unknown>) : null,
    schoolConfigRaw: schoolSnap.exists() ? (schoolSnap.data() as Record<string, unknown>) : null,
  });

  if (!resolved.ok) {
    return {
      pointsAwarded: 0,
      onTime: false,
      periodLabel: null,
      reason: resolved.reason,
      usedServer: false,
    };
  }

  const cfg = resolved.settings as AttendanceSettings;
  const r: RecordClassSignInResult = await recordClassSignIn(student.id, student, cfg);
  return {
    pointsAwarded: r.pointsAwarded,
    onTime: r.onTime,
    periodLabel: r.periodLabel ?? null,
    reason: r.reason,
    usedServer: false,
    source: resolved.source,
  };
}
