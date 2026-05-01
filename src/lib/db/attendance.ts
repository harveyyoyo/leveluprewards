import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import type { Student, AttendanceSettings, AttendanceLogEntry, AttendanceScheduleSlot, HistoryItem, RecordClassSignInResult, Class, AttendanceRewardRule } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { getSchoolDayClock } from '@/lib/attendance/schoolDayClock';
import { removeUndefined } from './helpers';

const ATTENDANCE_CONFIG_ID = 'config';
const EARLY_SIGN_IN_WINDOW_MINUTES = 10;

function toFiniteNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Get current period from schedule and whether sign-in is on time. */
function getCurrentPeriodAndOnTime(
  schedule: AttendanceSettings['schedule'],
  onTimeWindowMinutes: number,
  nowMinutes: number
): { periodLabel?: string; onTime: boolean } {
  if (!schedule?.length) return { onTime: false };
  for (const slot of schedule) {
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);
    if (nowMinutes >= start - EARLY_SIGN_IN_WINDOW_MINUTES && nowMinutes <= end) {
      const onTime = nowMinutes <= start + onTimeWindowMinutes;
      return { periodLabel: slot.label, onTime };
    }
  }
  return { onTime: false };
}

function getAssignedPeriodAndOnTime(
  schedule: AttendanceSettings['schedule'],
  assignedSlotId: string | undefined,
  onTimeWindowMinutes: number,
  nowMinutes: number
): { periodLabel?: string; onTime: boolean } {
  if (!assignedSlotId) return { onTime: false };
  const slot = (schedule || []).find((s) => s.id === assignedSlotId);
  if (!slot) return { onTime: false };
  const start = parseTimeToMinutes(slot.startTime);
  const end = parseTimeToMinutes(slot.endTime);
  if (nowMinutes < start - EARLY_SIGN_IN_WINDOW_MINUTES || nowMinutes > end) return { onTime: false };
  const onTime = nowMinutes <= start + onTimeWindowMinutes;
  return { periodLabel: slot.label, onTime };
}

// ---- Config getters/setters ----

export const getAttendanceConfig = async (
  firestore: Firestore,
  schoolId: string
): Promise<AttendanceSettings | null> => {
  const configRef = doc(firestore, 'schools', schoolId, 'attendance', ATTENDANCE_CONFIG_ID);
  const snap = await getDoc(configRef);
  const data = snap.data();
  if (!data) return null;
  const enabledClassIds = Array.isArray(data.enabledClassIds) ? data.enabledClassIds : undefined;
  return {
    pointsForSignIn: toFiniteNumber(data.pointsForSignIn, 0),
    pointsForOnTime: toFiniteNumber(data.pointsForOnTime, 0),
    onTimeWindowMinutes: toFiniteNumber(data.onTimeWindowMinutes, 15),
    enabledClassIds: enabledClassIds?.length ? enabledClassIds : undefined,
    classPeriodAssignments: (data.classPeriodAssignments && typeof data.classPeriodAssignments === 'object')
      ? data.classPeriodAssignments
      : undefined,
    classPeriodAssignmentsByDay:
      data.classPeriodAssignmentsByDay && typeof data.classPeriodAssignmentsByDay === 'object'
        ? (data.classPeriodAssignmentsByDay as Record<string, Record<string, string>>)
        : undefined,
    categoryId: data.categoryId,
    schedule: Array.isArray(data.schedule) ? data.schedule : [],
    attendanceTimeZone: typeof data.attendanceTimeZone === 'string' && data.attendanceTimeZone.trim()
      ? String(data.attendanceTimeZone).trim()
      : undefined,
  };
};

export const setAttendanceConfig = async (
  firestore: Firestore,
  schoolId: string,
  settings: AttendanceSettings
): Promise<void> => {
  const configRef = doc(firestore, 'schools', schoolId, 'attendance', ATTENDANCE_CONFIG_ID);
  try {
    await setDoc(configRef, removeUndefined(settings as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: configRef.path, operation: 'write', requestResourceData: settings });
    throw error;
  }
};

// ---- Per-teacher config ----

export const getTeacherAttendanceConfig = async (
  firestore: Firestore,
  schoolId: string,
  teacherId: string
): Promise<AttendanceSettings | null> => {
  if (!teacherId) return null;
  const configRef = doc(firestore, 'schools', schoolId, 'teachers', teacherId, 'attendanceConfig', ATTENDANCE_CONFIG_ID);
  const snap = await getDoc(configRef);
  const data = snap.data();
  if (!data) return null;
  const enabledClassIds = Array.isArray(data.enabledClassIds) ? data.enabledClassIds : undefined;
  return {
    pointsForSignIn: toFiniteNumber(data.pointsForSignIn, 0),
    pointsForOnTime: toFiniteNumber(data.pointsForOnTime, 0),
    onTimeWindowMinutes: toFiniteNumber(data.onTimeWindowMinutes, 15),
    enabledClassIds: enabledClassIds?.length ? enabledClassIds : undefined,
    classPeriodAssignments: (data.classPeriodAssignments && typeof data.classPeriodAssignments === 'object')
      ? data.classPeriodAssignments
      : undefined,
    classPeriodAssignmentsByDay:
      data.classPeriodAssignmentsByDay && typeof data.classPeriodAssignmentsByDay === 'object'
        ? (data.classPeriodAssignmentsByDay as Record<string, Record<string, string>>)
        : undefined,
    categoryId: data.categoryId,
    schedule: Array.isArray(data.schedule) ? data.schedule : [],
    teacherId,
  };
};

export const setTeacherAttendanceConfig = async (
  firestore: Firestore,
  schoolId: string,
  teacherId: string,
  settings: AttendanceSettings
): Promise<void> => {
  if (!teacherId) throw new Error('teacherId is required for per-teacher attendance settings');
  const configRef = doc(firestore, 'schools', schoolId, 'teachers', teacherId, 'attendanceConfig', ATTENDANCE_CONFIG_ID);
  try {
    await setDoc(configRef, removeUndefined({ ...settings, teacherId } as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: configRef.path, operation: 'write', requestResourceData: settings });
    throw error;
  }
};

// ---- Sign-in ----

export const recordClassSignIn = async (
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  student: Student,
  config: AttendanceSettings
): Promise<RecordClassSignInResult> => {
  if (config.enabledClassIds && config.enabledClassIds.length > 0) {
    const studentClassId = student.classId || '';
    if (!config.enabledClassIds.includes(studentClassId)) {
      return { pointsAwarded: 0, onTime: false, reason: 'class_not_in_enabled_list' };
    }
  }

  const now = Date.now();
  const studentClassId = (student.classId || '').trim();
  const clock = getSchoolDayClock(now, config.attendanceTimeZone, { whenUnset: 'local' });
  const dayOfWeekKey = clock.dayOfWeekKey;
  const nowMinutes = clock.minutesSinceMidnight;

  let assignedSlotId: string | undefined = undefined;
  if (studentClassId) {
    const byDay = config.classPeriodAssignmentsByDay;
    const dayMap = byDay?.[dayOfWeekKey];
    if (dayMap && Object.prototype.hasOwnProperty.call(dayMap, studentClassId)) {
      const v = dayMap[studentClassId];
      assignedSlotId = v === '__none__' ? undefined : v;
    } else {
      const allMap = byDay?.['all'];
      if (allMap && Object.prototype.hasOwnProperty.call(allMap, studentClassId)) {
        const v = allMap[studentClassId];
        assignedSlotId = v === '__none__' ? undefined : v;
      } else {
        assignedSlotId = config.classPeriodAssignments?.[studentClassId];
      }
    }
  }

  const assigned = getAssignedPeriodAndOnTime(config.schedule, assignedSlotId, config.onTimeWindowMinutes, nowMinutes);
  const fallback = getCurrentPeriodAndOnTime(config.schedule, config.onTimeWindowMinutes, nowMinutes);
  const periodLabel = assigned.periodLabel ?? fallback.periodLabel;
  const onTime = assigned.periodLabel ? assigned.onTime : fallback.onTime;
  const pointsForSignIn = toFiniteNumber(config.pointsForSignIn, 0);
  const pointsForOnTime = toFiniteNumber(config.pointsForOnTime, 0);
  const computedPoints = pointsForSignIn + (onTime ? pointsForOnTime : 0);

  const yyyy = clock.year;
  const mm = String(clock.month).padStart(2, '0');
  const dd = String(clock.day).padStart(2, '0');
  const dayKey = `${yyyy}${mm}${dd}`;
  const classKey = (student.classId || '').trim() || 'no_class';
  const periodKey = (periodLabel || '').trim() || 'no_period';
  const sessionId = `${dayKey}:${classKey}:${periodKey}`;

  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
  const logDocId = `${studentId}_${sessionId}`;
  const logRef = doc(firestore, 'schools', schoolId, 'attendanceLog', logDocId);

  const result = await runTransaction(firestore, async (transaction) => {
    const existing = await transaction.get(logRef);
    if (existing.exists()) {
      return { pointsAwarded: 0, onTime: false, periodLabel, reason: 'duplicate_same_session' as const };
    }

    const studentSnap = await transaction.get(studentRef);
    if (!studentSnap.exists()) throw new Error('Student not found');
    const data = studentSnap.data() as Student;

    transaction.update(studentRef, {
      points: (data.points || 0) + computedPoints,
      lifetimePoints: (data.lifetimePoints ?? 0) + computedPoints,
    });

    const desc = onTime && periodLabel
      ? `Attendance (on time): ${periodLabel}`
      : periodLabel
        ? `Attendance: ${periodLabel}`
        : 'Attendance';
    transaction.set(activityRef, { desc, amount: computedPoints, date: now } as HistoryItem);

    const studentName = [student.firstName, student.lastName].filter(Boolean).join(' ') || student.nickname || studentId;
    transaction.set(logRef, {
      studentId,
      studentName,
      signedInAt: now,
      pointsAwarded: computedPoints,
      onTime,
      periodLabel: periodLabel ?? null,
      sessionId,
      teacherId: config.teacherId ?? null,
    });

    return { pointsAwarded: computedPoints, onTime, periodLabel, reason: 'recorded' as const };
  });

  return result;
};

// ---- Logs ----

export const listAttendanceLog = async (
  firestore: Firestore,
  schoolId: string,
  limitCount: number = 50
): Promise<AttendanceLogEntry[]> => {
  const logRef = collection(firestore, 'schools', schoolId, 'attendanceLog');
  const q = query(logRef, orderBy('signedInAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId ?? '',
      studentName: data.studentName,
      signedInAt: data.signedInAt ?? 0,
      pointsAwarded: data.pointsAwarded ?? 0,
      onTime: data.onTime ?? false,
      periodLabel: data.periodLabel,
    };
  });
};

export const listTeacherAttendanceLog = async (
  firestore: Firestore,
  schoolId: string,
  teacherId: string,
  limitCount: number = 50
): Promise<AttendanceLogEntry[]> => {
  if (!teacherId) return [];
  const logRef = collection(firestore, 'schools', schoolId, 'attendanceLog');
  const q = query(
    logRef,
    where('teacherId', '==', teacherId),
    orderBy('signedInAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId ?? '',
      studentName: data.studentName,
      signedInAt: data.signedInAt ?? 0,
      pointsAwarded: data.pointsAwarded ?? 0,
      onTime: data.onTime ?? false,
      periodLabel: data.periodLabel,
      teacherId: data.teacherId,
    };
  });
};

/**
 * Ensures default AttendanceRewardRule documents exist for the given period IDs
 * across all classes that have a primary teacher.
 * 
 * Uses deterministic IDs to prevent duplicates and skips existing rules.
 */
export const ensureDefaultAttendanceRules = async (
  firestore: Firestore,
  schoolId: string,
  periodIds: string[]
): Promise<{ created: number; skipped: number }> => {
  if (!schoolId || !periodIds.length) return { created: 0, skipped: 0 };

  // 1. Get school-wide defaults
  const schoolConfig = await getAttendanceConfig(firestore, schoolId);
  
  // 2. Get all classes
  const classesRef = collection(firestore, 'schools', schoolId, 'classes');
  const classesSnap = await getDocs(classesRef);
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Class));

  const results = { created: 0, skipped: 0 };
  let batch = writeBatch(firestore);
  let batchCount = 0;

  for (const cls of classes) {
    if (!cls.primaryTeacherId) continue;

    for (const periodId of periodIds) {
      // Deterministic ID: "default_{classId}_{periodId}"
      const ruleId = `default_${cls.id}_${periodId}`;
      const ruleRef = doc(firestore, 'schools', schoolId, 'teachers', cls.primaryTeacherId, 'attendanceRewards', ruleId);
      
      // Check if it already exists
      const ruleSnap = await getDoc(ruleRef);
      if (ruleSnap.exists()) {
        results.skipped++;
        continue;
      }

      const rule: AttendanceRewardRule = {
        id: ruleId,
        teacherId: cls.primaryTeacherId,
        classId: cls.id,
        className: cls.name,
        periodId: periodId,
        pointsForSignIn: schoolConfig?.pointsForSignIn ?? 1,
        pointsForOnTime: schoolConfig?.pointsForOnTime ?? 5,
        onTimeWindowMinutes: schoolConfig?.onTimeWindowMinutes ?? 5,
        categoryId: schoolConfig?.categoryId,
        enabled: true,
        createdAt: Date.now(),
      };

      batch.set(ruleRef, removeUndefined(rule));
      batchCount++;
      results.created++;

      if (batchCount >= 400) {
        await batch.commit();
        batch = writeBatch(firestore);
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return results;
};

