import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { clearPortalDeviceCookie, readPortalDeviceId } from '@/lib/server/studentPortalDevice';
import { clearDeviceBinding, PORTAL_SESSION_COLLECTION } from '@/lib/server/studentPortalDb';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 8 * 1024;

async function getDb() {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  return admin.firestore();
}

/** POST: end student portal session and optional device binding. */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`student-portal:logout:${clientIp(req)}`, 30)) {
      return jsonError(429, 'Too many requests');
    }

    const body = await req.json().catch(() => ({}));
    const schoolId =
      typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : '';
    const clearDevice = body?.clearDevice === true;

    if (schoolId && SCHOOL_ID_RE.test(schoolId) && studentId) {
      const db = await getDb();
      await db
        .collection('schools')
        .doc(schoolId)
        .collection(PORTAL_SESSION_COLLECTION)
        .doc(studentId)
        .delete()
        .catch(() => undefined);
    }

    if (clearDevice && schoolId && SCHOOL_ID_RE.test(schoolId)) {
      const deviceId = readPortalDeviceId(req);
      if (deviceId) {
        const db = await getDb();
        await clearDeviceBinding(db, schoolId, deviceId).catch(() => undefined);
      }
    }

    const res = NextResponse.json({ ok: true });
    if (clearDevice) clearPortalDeviceCookie(res);
    return res;
  } catch (e) {
    console.error('[api/student-portal/logout] POST failed:', e);
    return jsonError(503, 'Logout failed.');
  }
}
