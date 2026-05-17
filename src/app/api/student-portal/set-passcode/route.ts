import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import type { Firestore } from 'firebase-admin/firestore';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import {
  generatePortalPasscodeSalt,
  hashPortalPasscode,
} from '@/lib/server/studentPortalPasscode';
import { studentPortalPasscodeSecretRef } from '@/lib/server/studentPortalDb';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 8 * 1024;
const MIN_PASSCODE_LEN = 4;
const MAX_PASSCODE_LEN = 12;

async function getDb() {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  return admin.firestore();
}

async function isSchoolAdmin(db: Firestore, schoolId: string, uid: string) {
  const snap = await db.collection('schools').doc(schoolId).collection('roles_admin').doc(uid).get();
  return snap.exists && snap.data()?.role === 'admin';
}

/** POST: admin sets or clears a student's portal passcode (stored hashed). */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`student-portal:set-passcode:${clientIp(req)}`, 40)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const body = await req.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    const schoolId =
      typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : '';
    const passcode = typeof body?.passcode === 'string' ? body.passcode.trim() : '';
    const clear = body?.clear === true;

    if (!idToken || !schoolId || !studentId || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'idToken, schoolId, and studentId are required.');
    }

    const auth = await getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const db = await getDb();

    if (!(await isSchoolAdmin(db, schoolId, decoded.uid))) {
      return jsonError(403, 'Admin access required.');
    }

    const studentRef = db.collection('schools').doc(schoolId).collection('students').doc(studentId);

    if (clear || passcode === '') {
      await studentPortalPasscodeSecretRef(db, schoolId, studentId).delete().catch(() => undefined);
      await studentRef.set({ portalPasscodeSet: false }, { merge: true });
      return NextResponse.json({ ok: true, cleared: true });
    }

    if (passcode.length < MIN_PASSCODE_LEN || passcode.length > MAX_PASSCODE_LEN) {
      return jsonError(400, `Passcode must be ${MIN_PASSCODE_LEN}–${MAX_PASSCODE_LEN} characters.`);
    }

    const salt = generatePortalPasscodeSalt();
    const portalPasscodeHash = hashPortalPasscode(passcode, salt);
    await studentPortalPasscodeSecretRef(db, schoolId, studentId).set(
      { portalPasscodeHash, portalPasscodeSalt: salt },
      { merge: true },
    );
    await studentRef.set(
      {
        portalPasscodeSet: true,
        portalFailedAttempts: 0,
        portalLocked: false,
        portalLockedAt: null,
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/student-portal/set-passcode] POST failed:', e);
    return jsonError(503, 'Could not save passcode.');
  }
}
