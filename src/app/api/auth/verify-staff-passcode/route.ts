import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import {
  isStaffLoginRole,
  STAFF_LOGIN_ROLES,
  verifyStaffAccountPasscodeServer,
} from '@/lib/server/verifyStaffPasscode';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 8 * 1024;

async function getDb() {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  return admin.firestore();
}

/** POST: verify desk staff passcode and grant role docs (librarian, office, etc.). */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`staff-passcode:${clientIp(req)}`, 30)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const body = await req.json();
    const idToken = bearer || (typeof body?.idToken === 'string' ? body.idToken : '');
    const schoolId =
      typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
    const passcode = typeof body?.passcode === 'string' ? body.passcode : '';
    const role = typeof body?.role === 'string' ? body.role.trim() : '';

    if (!idToken || !schoolId || !username || !passcode || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'idToken, schoolId, username, passcode, and role are required.');
    }

    if (!isStaffLoginRole(role)) {
      return jsonError(
        400,
        `role must be one of: ${STAFF_LOGIN_ROLES.map((r) => `'${r}'`).join(', ')}.`,
      );
    }

    const auth = await getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const db = await getDb();

    const result = await verifyStaffAccountPasscodeServer(
      db,
      decoded.uid,
      schoolId,
      username,
      passcode,
      role,
    );

    return NextResponse.json({
      success: true,
      displayName: result.displayName,
      roles: result.roles,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === 'INVALID_STAFF_LOGIN') {
      return jsonError(403, 'Invalid staff login.');
    }
    console.error('[api/auth/verify-staff-passcode] POST failed:', e);
    return jsonError(503, 'Could not verify staff login. Check Firebase Admin credentials.');
  }
}
