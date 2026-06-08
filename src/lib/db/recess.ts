import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
  addDoc,
  type Firestore,
} from 'firebase/firestore';
import type { RecessLogEntry, RecessPassActive, RecessReason, Student } from '@/lib/types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';

/**
 * Recess / break checkout helpers.
 *
 * Mirrors the bathroom-pass model but is its own feature so the Recess tab can be
 * used independently of the classroom bathroom timer:
 *   - Active checkouts: `schools/{schoolId}/recessActive/{studentId}` (one doc per student out)
 *   - History:          `schools/{schoolId}/recessLog`
 */

export async function startRecessCheckout(
  firestore: Firestore,
  schoolId: string,
  student: Student,
  meta: { reason: RecessReason; note?: string; staffId?: string; staffName?: string; classId?: string },
): Promise<void> {
  const studentId = student.id;
  const activeRef = doc(firestore, 'schools', schoolId, 'recessActive', studentId);
  const studentName =
    [student.firstName, student.lastName].filter(Boolean).join(' ') || student.nickname || studentId;

  const payload: RecessPassActive = removeUndefined({
    studentId,
    studentName,
    classId: meta.classId ?? student.classId,
    reason: meta.reason,
    note: meta.note?.trim() || undefined,
    startedAt: Date.now(),
    staffId: meta.staffId,
    staffName: meta.staffName,
  }) as RecessPassActive;

  try {
    await setDoc(activeRef, payload);
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: activeRef.path,
      operation: 'write',
      requestResourceData: payload,
    });
    throw error;
  }
}

export async function endRecessCheckout(
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  maxMinutes: number,
): Promise<RecessLogEntry | null> {
  const activeRef = doc(firestore, 'schools', schoolId, 'recessActive', studentId);
  const snap = await getDoc(activeRef);
  if (!snap.exists()) return null;

  const active = snap.data() as RecessPassActive;
  const returnedAt = Date.now();
  const durationMs = Math.max(0, returnedAt - (active.startedAt || returnedAt));
  const overLimit = maxMinutes > 0 && durationMs > maxMinutes * 60 * 1000;

  const logEntry: RecessLogEntry = removeUndefined({
    studentId: active.studentId || studentId,
    studentName: active.studentName,
    classId: active.classId,
    reason: active.reason,
    note: active.note,
    startedAt: active.startedAt,
    returnedAt,
    durationMs,
    overLimit,
    maxMinutes: maxMinutes > 0 ? maxMinutes : undefined,
    staffId: active.staffId,
    staffName: active.staffName,
  }) as RecessLogEntry;

  const logRef = collection(firestore, 'schools', schoolId, 'recessLog');
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
