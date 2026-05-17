import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { PORTAL_LOBBY_COLLECTION } from '@/lib/server/studentPortalDb';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 8 * 1024;

async function getDb() {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  return admin.firestore();
}

/** POST: register browser for student-home lobby (studentPortal gate scope only). */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`student-portal:lobby:${clientIp(req)}`, 30)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const body = await req.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    const schoolId =
      typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    if (!idToken || !schoolId || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'idToken and schoolId are required.');
    }

    const auth = await getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const db = await getDb();

    let appSettings: Record<string, unknown> = {};
    let active = true;

    const schoolSnap = await db.collection('schools').doc(schoolId).get();
    if (schoolSnap.exists) {
      const schoolData = schoolSnap.data() as Record<string, unknown>;
      if (schoolData.active === false) active = false;
      appSettings = (schoolData.appSettings || {}) as Record<string, unknown>;
    } else {
      const publicSnap = await db.collection('schoolPublic').doc(schoolId).get();
      if (!publicSnap.exists) return jsonError(404, 'School not found.');
      const publicData = publicSnap.data() as Record<string, unknown>;
      if (publicData.active === false) active = false;
      appSettings = (publicData.appSettings || {}) as Record<string, unknown>;
    }

    if (!active) {
      return jsonError(403, 'This school is not active.');
    }
    if (appSettings.enableStudentPortal !== true) {
      return jsonError(403, 'Student home portal is not enabled for this school.');
    }

    await db
      .collection('schools')
      .doc(schoolId)
      .collection(PORTAL_LOBBY_COLLECTION)
      .doc(decoded.uid)
      .set({ createdAt: Date.now(), source: 'student-portal-lobby' }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/student-portal/lobby] POST failed:', e);
    if (/credential|admin|ENOENT|invalid.*token/i.test(msg)) {
      return jsonError(
        503,
        'Server auth is not configured. Deploy Cloud Functions or set Firebase Admin credentials for local API routes.',
      );
    }
    return jsonError(503, 'Could not open student portal lobby.');
  }
}
