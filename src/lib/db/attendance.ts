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
  Firestore,
} from 'firebase/firestore';
import type { Student, AttendanceSettings, AttendanceLogEntry, AttendanceScheduleSlot, HistoryItem, RecordClassSignInResult } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';

const ATTENDANCE_CONFIG_ID = 'config';

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
  now: number
): { periodLabel?: string; onTime: boolean } {
  if (!schedule?.length) return { onTime: false };
  const d = new Date(now);
  const nowMinutes = d.getHours() * 60 + d.getMinutes();
  for (const slot of schedule) {
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);
    if (nowMinutes >= start && nowMinutes <= end) {
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
  now: number
): { periodLabel?: string; onTime: boolean } {
  if (!assignedSlotId) return { onTime: false };
  const slot = (schedule || []).find((s) => s.id === assignedSlotId);
  if (!slot) return { onTime: false };
  const d = new Date(now);
  const nowMinutes = d.getHours() * 60 + d.getMinutes();
  const start = parseTimeToMinutes(slot.startTime);
  const end = parseTimeToMinutes(slot.endTime);
  if (nowMinutes < start || nowMinutes > end) return { onTime: false };
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
    categoryId: data.categoryId,
    schedule: Array.isArray(data.schedule) ? data.schedule : [],
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

  const dayOfWeekKey = (() => {
    const d = new Date(now);
    const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
    return map[d.getDay()] ?? 'mon';
  })();

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

  const assigned = getAssignedPeriodAndOnTime(config.schedule, assignedSlotId, config.onTimeWindowMinutes, now);
  const fallback = getCurrentPeriodAndOnTime(config.schedule, config.onTimeWindowMinutes, now);
  const periodLabel = assigned.periodLabel ?? fallback.periodLabel;
  const onTime = assigned.periodLabel ? assigned.onTime : fallback.onTime;
  const pointsForSignIn = toFiniteNumber(config.pointsForSignIn, 0);
  const pointsForOnTime = toFiniteNumber(config.pointsForOnTime, 0);
  const computedPoints = pointsForSignIn + (onTime ? pointsForOnTime : 0);

  const d = new Date(now);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
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
