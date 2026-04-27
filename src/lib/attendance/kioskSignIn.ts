import { httpsCallable } from 'firebase/functions';
import type { Functions } from 'firebase/functions';
import type {
  Student,
  AttendanceKioskSignInResult,
} from '@/lib/types';
import { ATTENDANCE_RESOLVE_FAILURE_MESSAGES, type AttendanceResolveSource } from '@/lib/attendance/resolveSettings';

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
    return 'Could not reach the attendance server; attendance was not recorded.';
  }
  return 'Attendance was not recorded.';
}

/**
 * Trusted attendance sign-in. The Cloud Function is the only code path that
 * awards points so attendance logs and balances stay auditable.
 */
export async function performKioskAttendanceSignIn(params: {
  functions: Functions;
  schoolId: string;
  student: Student;
}): Promise<AttendanceKioskSignInResult> {
  const { functions, schoolId, student } = params;

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
    // eslint-disable-next-line no-console
    console.warn('[attendance] signInAttendance callable failed:', err);
    return {
      pointsAwarded: 0,
      onTime: false,
      periodLabel: null,
      reason: 'callable_failed',
      usedServer: false,
    };
  }
}
