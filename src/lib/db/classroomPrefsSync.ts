/**
 * Syncs a teacher's Classroom Realm prefs (seating layouts, quick-award prefs, room-display
 * prefs) to Firestore so they survive a cleared cache and follow the teacher across devices.
 *
 * Local `localStorage` (see `classroomSeatingChart.ts` / `classroomScreen.ts`) stays the fast,
 * synchronous read/write path used by every component — this module only mirrors changes to
 * Firestore in the background and hydrates localStorage from Firestore once when a teacher
 * enters the realm. One doc per teacher, following the same `teachers/{teacherId}/<sub>/config`
 * convention as `attendanceConfig` (see `src/lib/db/attendance.ts`).
 */

import { doc, getDoc, setDoc, type DocumentData, type Firestore } from 'firebase/firestore';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefinedDeep } from '@/lib/db/helpers';
import {
  CLASSROOM_PREFS_VERSION,
  saveClassroomLayout,
  saveClassroomPrefs,
  type ClassroomSeatingLayout,
  type ClassroomSeatingPrefs,
} from '@/lib/classroomSeatingChart';
import { saveClassroomScreenPrefs, type ClassroomScreenPrefs } from '@/lib/classroomScreen';

const CLASSROOM_PREFS_DOC_ID = 'config';
const SYNC_DEBOUNCE_MS = 800;

export type ClassroomPrefsCloudDoc = {
  teacherId: string;
  prefsVersion: number;
  seatingPrefsByScope?: Record<string, ClassroomSeatingPrefs>;
  layoutsByClass?: Record<string, ClassroomSeatingLayout>;
  screenPrefsByClass?: Record<string, ClassroomScreenPrefs>;
  updatedAt?: number;
};

type ClassroomPrefsCloudPatch = Pick<
  ClassroomPrefsCloudDoc,
  'seatingPrefsByScope' | 'layoutsByClass' | 'screenPrefsByClass'
>;

function classroomPrefsDocRef(firestore: Firestore, schoolId: string, teacherId: string) {
  return doc(firestore, 'schools', schoolId, 'teachers', teacherId, 'classroomPrefs', CLASSROOM_PREFS_DOC_ID);
}

/**
 * One-shot fetch when a teacher enters the realm. Writes through the existing local save
 * functions so version migration/normalization on the next `load*` call still applies —
 * Firestore is just another place prefs were "found", not a bypass of that logic.
 */
export async function hydrateClassroomPrefsFromFirestore(
  firestore: Firestore,
  schoolId: string,
  teacherId: string,
): Promise<void> {
  if (!schoolId || !teacherId) return;
  const ref = classroomPrefsDocRef(firestore, schoolId, teacherId);
  try {
    const snap = await getDoc(ref);
    const data = snap.data() as ClassroomPrefsCloudDoc | undefined;
    if (!data) return;
    for (const [scope, prefs] of Object.entries(data.seatingPrefsByScope ?? {})) {
      if (prefs) saveClassroomPrefs(schoolId, scope, prefs);
    }
    for (const [classId, layout] of Object.entries(data.layoutsByClass ?? {})) {
      if (layout) saveClassroomLayout(schoolId, teacherId, classId, layout);
    }
    for (const [classId, screenPrefs] of Object.entries(data.screenPrefsByClass ?? {})) {
      if (screenPrefs) saveClassroomScreenPrefs(schoolId, teacherId, classId, screenPrefs);
    }
  } catch (error) {
    reportFirestorePermissionError(error, { path: ref.path, operation: 'get' });
  }
}

const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingPatches = new Map<string, ClassroomPrefsCloudPatch>();

function flushClassroomPrefsSync(firestore: Firestore, schoolId: string, teacherId: string, key: string) {
  flushTimers.delete(key);
  const payload = pendingPatches.get(key);
  pendingPatches.delete(key);
  if (!payload) return;
  const ref = classroomPrefsDocRef(firestore, schoolId, teacherId);
  const write = removeUndefinedDeep({
    teacherId,
    prefsVersion: CLASSROOM_PREFS_VERSION,
    ...payload,
    updatedAt: Date.now(),
  }) as DocumentData;
  void setDoc(ref, write, { merge: true }).catch((error) => {
    reportFirestorePermissionError(error, { path: ref.path, operation: 'write', requestResourceData: payload });
  });
}

/** Debounced background mirror of a local prefs/layout/screen-prefs change to Firestore. */
export function queueClassroomPrefsFirestoreSync(
  firestore: Firestore,
  schoolId: string,
  teacherId: string,
  patch: ClassroomPrefsCloudPatch,
) {
  if (!schoolId || !teacherId) return;
  const key = `${schoolId}:${teacherId}`;
  pendingPatches.set(key, { ...pendingPatches.get(key), ...patch });
  const existing = flushTimers.get(key);
  if (existing) clearTimeout(existing);
  flushTimers.set(
    key,
    setTimeout(() => flushClassroomPrefsSync(firestore, schoolId, teacherId, key), SYNC_DEBOUNCE_MS),
  );
}
