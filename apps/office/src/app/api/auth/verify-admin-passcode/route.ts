import { NextRequest, NextResponse } from 'next/server';
import {
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
} from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import {
  verifyAdminPasscodeServer,
  VerifyAdminPasscodeError,
} from '@/lib/server/verifyAdminPasscode';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 8 * 1024;

/** POST: verify admin passcode and grant admin role doc. */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`verify-admin-passcode:${clientIp(req)}`, 30)) {
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
    const passcode = typeof body?.passcode === 'string' ? body.passcode : '';

    if (!idToken || !schoolId || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'idToken and schoolId are required.');
    }

    const auth = await getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const db = await getFirebaseAdminFirestore();

    await verifyAdminPasscodeServer(db, {
      uid: decoded.uid,
      email: String(decoded.email ?? ''),
      firebase: decoded.firebase as Record<string, unknown> | undefined,
      schoolId,
      passcode,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof VerifyAdminPasscodeError) {
      const status =
        e.code === 'not-found'
          ? 404
          : e.code === 'permission-denied'
            ? 403
            : e.code === 'failed-precondition'
              ? 412
              : 400;
      return jsonError(status, e.message);
    }
    console.error('[api/auth/verify-admin-passcode] POST failed:', e);
    return jsonError(503, 'Could not verify admin passcode. Check Firebase Admin credentials.');
  }
}
