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
  getDeviceBinding,
  lookupStudentIdByBadge,
  portalPasscodeRequired,
  studentHasPortalPasscode,
  type StudentPortalStudentFields,
} from '@/lib/server/studentPortalDb';

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
  if (!lobby.exists) {
    throw new Error('LOBBY_REQUIRED');
  }
}

/** POST: resolve badge id → whether passcode is required (no PII returned). */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`student-portal:lookup:${clientIp(req)}`, 40)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const body = await req.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    const schoolId =
      typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const badgeId = typeof body?.badgeId === 'string' ? body.badgeId.trim() : '';
    if (!idToken || !schoolId || !badgeId || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'idToken, schoolId, and badgeId are required.');
    }

    const auth = await getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const db = await getDb();

    try {
      await assertPortalLobby(db, schoolId, decoded.uid);
    } catch {
      return jsonError(403, 'Open the student portal link first, then try again.');
    }

    const schoolSnap = await db.collection('schools').doc(schoolId).get();
    if (!schoolSnap.exists) return jsonError(404, 'School not found.');
    const appSettings = (schoolSnap.data()?.appSettings || {}) as Record<string, unknown>;
    if (appSettings.enableStudentPortal !== true) {
      return jsonError(403, 'Student home portal is not enabled.');
    }

    const studentId = await lookupStudentIdByBadge(db, schoolId, badgeId);
    if (!studentId) {
      return NextResponse.json({ ok: true, found: false });
    }

    const studentSnap = await db
      .collection('schools')
      .doc(schoolId)
      .collection('students')
      .doc(studentId)
      .get();
    if (!studentSnap.exists) {
      return NextResponse.json({ ok: true, found: false });
    }

    const student = studentSnap.data() as StudentPortalStudentFields;
    if (student.portalLocked === true) {
      return NextResponse.json({
        ok: true,
        found: true,
        studentId,
        locked: true,
        requiresPasscode: false,
      });
    }

    let deviceId = readPortalDeviceId(req);
    const resBody: Record<string, unknown> = {
      ok: true,
      found: true,
      studentId,
      locked: false,
      requiresPasscode:
        portalPasscodeRequired(appSettings) || studentHasPortalPasscode(student),
    };

    if (deviceId) {
      const binding = await getDeviceBinding(db, schoolId, deviceId);
      if (binding && binding.studentId !== studentId) {
        return NextResponse.json({
          ...resBody,
          deviceBlocked: true,
          message:
            'This browser is already linked to another student at home. Use a different device or ask your school admin to reset this device.',
        });
      }
    } else {
      deviceId = generatePortalDeviceId();
    }

    const res = NextResponse.json(resBody);
    if (deviceId) setPortalDeviceCookie(res, deviceId);
    return res;
  } catch (e) {
    console.error('[api/student-portal/lookup] POST failed:', e);
    return jsonError(503, 'Lookup failed.');
  }
}
