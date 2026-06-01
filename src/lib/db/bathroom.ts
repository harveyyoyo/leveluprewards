import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
  addDoc,
  type Firestore,
} from 'firebase/firestore';
import type { BathroomLogEntry, BathroomPassActive, Student } from '@/lib/types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';

export async function startBathroomPass(
  firestore: Firestore,
  schoolId: string,
  student: Student,
  meta: { teacherId?: string; teacherName?: string; classId?: string },
): Promise<void> {
  const studentId = student.id;
  const activeRef = doc(firestore, 'schools', schoolId, 'bathroomActive', studentId);
  const studentName =
    [student.firstName, student.lastName].filter(Boolean).join(' ') || student.nickname || studentId;
  const payload: BathroomPassActive = removeUndefined({
    studentId,
    studentName,
    classId: meta.classId ?? student.classId,
    startedAt: Date.now(),
    teacherId: meta.teacherId,
    teacherName: meta.teacherName,
  }) as BathroomPassActive;

  try {
    await setDoc(activeRef, payload);
  } catch (error) {
    reportFirestorePermissionError(error, { path: activeRef.path, operation: 'write', requestResourceData: payload });
    throw error;
  }
}

export async function endBathroomPass(
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  maxMinutes: number,
): Promise<BathroomLogEntry | null> {
  const activeRef = doc(firestore, 'schools', schoolId, 'bathroomActive', studentId);
  const snap = await getDoc(activeRef);
  if (!snap.exists()) return null;

  const active = snap.data() as BathroomPassActive;
  const returnedAt = Date.now();
  const durationMs = Math.max(0, returnedAt - (active.startedAt || returnedAt));
  const overLimit = maxMinutes > 0 && durationMs > maxMinutes * 60 * 1000;

  const logEntry: BathroomLogEntry = removeUndefined({
    studentId: active.studentId || studentId,
    studentName: active.studentName,
    classId: active.classId,
    startedAt: active.startedAt,
    returnedAt,
    durationMs,
    overLimit,
    maxMinutes: maxMinutes > 0 ? maxMinutes : undefined,
    teacherId: active.teacherId,
    teacherName: active.teacherName,
  }) as BathroomLogEntry;

  const logRef = collection(firestore, 'schools', schoolId, 'bathroomLog');
  try {
    await addDoc(logRef, logEntry);
    await deleteDoc(activeRef);
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: `${logRef.path} / ${activeRef.path}`,
      operation: 'write',
      requestResourceData: logEntry,
    });
    throw error;
  }

  return logEntry;
}
