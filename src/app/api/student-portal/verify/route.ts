import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import {
  generatePortalDeviceId,
  readPortalDeviceId,
  setPortalDeviceCookie,
} from '@/lib/server/studentPortalDevice';
import type { Firestore } from 'firebase-admin/firestore';
import {
  bindDeviceToStudent,
  getDeviceBinding,
  portalMaxAttempts,
  portalPasscodeRequired,
  PORTAL_SESSION_COLLECTION,
  readPortalPasscodeSecret,
  studentHasPortalPasscode,
  type StudentPortalStudentFields,
} from '@/lib/server/studentPortalDb';
import { verifyPortalPasscode } from '@/lib/server/studentPortalPasscode';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 8 * 1024;

async function getDb() {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  return admin.firestore();
}

async function assertPortalLobby(db: Firestore, schoolId: string, uid: string) {
  const lobby = await db
    .collection('schools')
    .doc(schoolId)
    .collection('studentPortalMembers')
    .doc(uid)
    .get();
  if (!lobby.exists) throw new Error('LOBBY_REQUIRED');
}

/** POST: verify optional passcode and mint a student-scoped custom token. */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`student-portal:verify:${clientIp(req)}`, 25)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const body = await req.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    const schoolId =
      typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : '';
    const passcode = typeof body?.passcode === 'string' ? body.passcode : '';
    if (!idToken || !schoolId || !studentId || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'idToken, schoolId, and studentId are required.');
    }

    const auth = await getFirebaseAdminAuth();
    const lobbyDecoded = await auth.verifyIdToken(idToken, true);
    const db = await getDb();

    try {
      await assertPortalLobby(db, schoolId, lobbyDecoded.uid);
    } catch {
      return jsonError(403, 'Open the student portal link first, then try again.');
    }

    const schoolSnap = await db.collection('schools').doc(schoolId).get();
    if (!schoolSnap.exists) return jsonError(404, 'School not found.');
    const appSettings = (schoolSnap.data()?.appSettings || {}) as Record<string, unknown>;
    if (appSettings.enableStudentPortal !== true) {
      return jsonError(403, 'Student home portal is not enabled.');
    }

    const studentRef = db.collection('schools').doc(schoolId).collection('students').doc(studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) return jsonError(404, 'Student not found.');

    const student = studentSnap.data() as StudentPortalStudentFields;
    if (student.portalLocked === true) {
      return jsonError(403, 'This account is locked. Ask your school admin to unlock it.');
    }

    let deviceId = readPortalDeviceId(req) ?? generatePortalDeviceId();
    const binding = await getDeviceBinding(db, schoolId, deviceId);
    if (binding && binding.studentId !== studentId) {
      return jsonError(
        403,
        'This browser is already linked to another student at home. Use a different device or ask your school admin to reset this device.',
      );
    }

    const needsPasscode =
      portalPasscodeRequired(appSettings) || studentHasPortalPasscode(student);

    if (needsPasscode) {
      if (!studentHasPortalPasscode(student)) {
        return jsonError(
          403,
          'A personal portal passcode is required but has not been set. Ask your school admin.',
        );
      }
      if (!passcode.trim()) {
        return jsonError(400, 'Passcode is required.');
      }
      const secret = await readPortalPasscodeSecret(db, schoolId, studentId);
      if (!secret) {
        return jsonError(403, 'A personal portal passcode is required but has not been set. Ask your school admin.');
      }
      const valid = verifyPortalPasscode(
        passcode,
        secret.portalPasscodeSalt,
        secret.portalPasscodeHash,
      );
      if (!valid) {
        const maxAttempts = portalMaxAttempts(appSettings);
        const attempts = Number(student.portalFailedAttempts || 0) + 1;
        const patch: Record<string, unknown> = {
          portalFailedAttempts: attempts,
        };
        if (attempts >= maxAttempts) {
          patch.portalLocked = true;
          patch.portalLockedAt = Date.now();
        }
        await studentRef.set(patch, { merge: true });
        const remaining = Math.max(0, maxAttempts - attempts);
        if (attempts >= maxAttempts) {
          return jsonError(
            403,
            'Too many incorrect passcodes. This account is locked — ask your school admin to unlock it.',
          );
        }
        return jsonError(
          403,
          remaining === 1
            ? 'Incorrect passcode. One attempt remaining before lockout.'
            : `Incorrect passcode. ${remaining} attempts remaining.`,
        );
      }
      await studentRef.set(
        { portalFailedAttempts: 0, portalLocked: false, portalLockedAt: null },
        { merge: true },
      );
    }

    await bindDeviceToStudent(db, schoolId, deviceId, studentId);
    await db
      .collection('schools')
      .doc(schoolId)
      .collection(PORTAL_SESSION_COLLECTION)
      .doc(studentId)
      .set({
        deviceId,
        activeAt: Date.now(),
        lobbyUid: lobbyDecoded.uid,
      });

    const customToken = await auth.createCustomToken(studentId, {
      schoolId,
      studentPortal: true,
    });

    const res = NextResponse.json({ ok: true, customToken, studentId });
    setPortalDeviceCookie(res, deviceId);
    return res;
  } catch (e) {
    console.error('[api/student-portal/verify] POST failed:', e);
    return jsonError(503, 'Sign-in failed.');
  }
}
