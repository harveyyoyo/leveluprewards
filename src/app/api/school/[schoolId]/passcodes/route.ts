import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { PASSCODE_SECRET_IDS } from '@/lib/passcodeSecrets';
import { getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import { writePasscodeSecret } from '@/lib/server/passcodeCredential';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { verifyStaffForSchoolApi } from '@/lib/server/verifyStaffForSchoolApi';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 8 * 1024;

type PasscodePatch = {
  schoolAccessPasscode?: string;
  adminPasscode?: string;
  passcode?: string;
};

/** PATCH: hash and store school passcodes server-side (admin only). */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ schoolId: string }> },
) {
  try {
    if (!sameOrigin(request)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`school-passcodes:${clientIp(request)}`, 20)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const { schoolId: rawSchoolId } = await context.params;
    const schoolId = rawSchoolId.trim().toLowerCase();
    if (!schoolId || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'schoolId is required.');
    }

    const session = await verifyStaffForSchoolApi(request, schoolId);
    if (!session?.scopes.has('admin') && !session?.scopes.has('dev')) {
      return jsonError(403, 'Admin access required.');
    }

    const body = (await request.json()) as PasscodePatch;
    const db = await getFirebaseAdminFirestore();
    const schoolRef = db.collection('schools').doc(schoolId);
    const patch: Record<string, unknown> = {};

    const schoolAccess =
      typeof body.schoolAccessPasscode === 'string'
        ? body.schoolAccessPasscode.trim()
        : typeof body.passcode === 'string'
          ? body.passcode.trim()
          : '';
    const adminCode =
      typeof body.adminPasscode === 'string'
        ? body.adminPasscode.trim()
        : typeof body.passcode === 'string'
          ? body.passcode.trim()
          : '';

    if (schoolAccess) {
      await writePasscodeSecret(db, schoolId, PASSCODE_SECRET_IDS.schoolAccess, schoolAccess);
      patch.schoolAccessPasscode = FieldValue.delete();
      patch.passcode = FieldValue.delete();
    }
    if (adminCode) {
      await writePasscodeSecret(db, schoolId, PASSCODE_SECRET_IDS.admin, adminCode);
      patch.adminPasscode = FieldValue.delete();
    }

    if (Object.keys(patch).length > 0) {
      await schoolRef.set(patch, { merge: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(500, (error as Error).message || 'Passcode update failed.');
  }
}
