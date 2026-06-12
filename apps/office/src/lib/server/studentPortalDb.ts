import type { Firestore } from 'firebase-admin/firestore';

export const PORTAL_DEVICE_COLLECTION = 'studentPortalDevices';
export const PORTAL_SESSION_COLLECTION = 'studentPortalSessions';
export const PORTAL_LOBBY_COLLECTION = 'studentPortalMembers';

export type StudentPortalStudentFields = {
  portalPasscodeSet?: boolean;
  portalLocked?: boolean;
  portalFailedAttempts?: number;
  portalLockedAt?: number;
};

export type PortalPasscodeSecret = {
  portalPasscodeHash: string;
  portalPasscodeSalt: string;
};

export function studentPortalPasscodeSecretRef(
  db: Firestore,
  schoolId: string,
  studentId: string,
) {
  return db
    .collection('schools')
    .doc(schoolId)
    .collection('secrets')
    .doc(`portal_${studentId}`);
}

export async function readPortalPasscodeSecret(
  db: Firestore,
  schoolId: string,
  studentId: string,
): Promise<PortalPasscodeSecret | null> {
  const snap = await studentPortalPasscodeSecretRef(db, schoolId, studentId).get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (typeof d?.portalPasscodeHash !== 'string' || typeof d?.portalPasscodeSalt !== 'string') {
    return null;
  }
  return {
    portalPasscodeHash: d.portalPasscodeHash,
    portalPasscodeSalt: d.portalPasscodeSalt,
  };
}

export function portalMaxAttempts(appSettings: Record<string, unknown> | undefined): number {
  const n = Number(appSettings?.studentPortalMaxFailedAttempts);
  if (Number.isFinite(n) && n >= 3 && n <= 20) return Math.round(n);
  return 5;
}

export function portalPasscodeRequired(appSettings: Record<string, unknown> | undefined): boolean {
  return appSettings?.studentPortalRequirePasscode !== false;
}

export function studentHasPortalPasscode(data: StudentPortalStudentFields | undefined): boolean {
  return data?.portalPasscodeSet === true;
}

export async function lookupStudentIdByBadge(
  db: Firestore,
  schoolId: string,
  badgeId: string,
): Promise<string | null> {
  const studentsRef = db.collection('schools').doc(schoolId).collection('students');
  const byDoc = await studentsRef.doc(badgeId).get();
  if (byDoc.exists) return byDoc.id;

  const byStr = await studentsRef.where('nfcId', '==', badgeId).limit(1).get();
  if (!byStr.empty) return byStr.docs[0].id;

  if (/^\d+$/.test(badgeId)) {
    const asNum = Number(badgeId);
    if (Number.isFinite(asNum)) {
      const byNum = await studentsRef.where('nfcId', '==', asNum).limit(1).get();
      if (!byNum.empty) return byNum.docs[0].id;
    }
  }
  return null;
}

export async function getDeviceBinding(
  db: Firestore,
  schoolId: string,
  deviceId: string,
): Promise<{ studentId: string } | null> {
  const snap = await db
    .collection('schools')
    .doc(schoolId)
    .collection(PORTAL_DEVICE_COLLECTION)
    .doc(deviceId)
    .get();
  if (!snap.exists) return null;
  const studentId = typeof snap.data()?.studentId === 'string' ? snap.data()!.studentId : '';
  return studentId ? { studentId } : null;
}

export async function bindDeviceToStudent(
  db: Firestore,
  schoolId: string,
  deviceId: string,
  studentId: string,
): Promise<void> {
  await db
    .collection('schools')
    .doc(schoolId)
    .collection(PORTAL_DEVICE_COLLECTION)
    .doc(deviceId)
    .set({ studentId, boundAt: Date.now() }, { merge: true });
}

export async function clearDeviceBinding(
  db: Firestore,
  schoolId: string,
  deviceId: string,
): Promise<void> {
  await db
    .collection('schools')
    .doc(schoolId)
    .collection(PORTAL_DEVICE_COLLECTION)
    .doc(deviceId)
    .delete();
}
