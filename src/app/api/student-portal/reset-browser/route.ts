import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import type { Firestore } from 'firebase-admin/firestore';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { PORTAL_DEVICE_COLLECTION } from '@/lib/server/studentPortalDb';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 8 * 1024;

async function getDb() {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  return admin.firestore();
}

async function isSchoolAdmin(db: Firestore, schoolId: string, uid: string) {
  const snap = await db.collection('schools').doc(schoolId).collection('roles_admin').doc(uid).get();
  return snap.exists && snap.data()?.role === 'admin';
}

/** POST: admin clears home-browser link so another student can sign in on that device. */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`student-portal:reset-browser:${clientIp(req)}`, 40)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const body = await req.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    const schoolId =
      typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : '';
    if (!idToken || !schoolId || !studentId || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'idToken, schoolId, and studentId are required.');
    }

    const auth = await getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const db = await getDb();

    if (!(await isSchoolAdmin(db, schoolId, decoded.uid))) {
      return jsonError(403, 'Admin access required.');
    }

    const devicesRef = db.collection('schools').doc(schoolId).collection(PORTAL_DEVICE_COLLECTION);
    const bound = await devicesRef.where('studentId', '==', studentId).get();
    const batch = db.batch();
    bound.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    return NextResponse.json({ ok: true, cleared: bound.size });
  } catch (e) {
    console.error('[api/student-portal/reset-browser] POST failed:', e);
    return jsonError(503, 'Could not reset browser link.');
  }
}
