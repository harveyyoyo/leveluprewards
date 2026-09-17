import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { resolveSchoolGateScopes } from '@/lib/server/resolveSchoolGateScopes';
import { writePasscodeSecret } from '@/lib/server/passcodeCredential';
import { staffPasscodeSecretId } from '@/lib/passcodeSecrets';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const ACCOUNT_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 4 * 1024;

/**
 * POST: hash and store an office staff account's passcode server-side.
 * The passcode is never written to the staffAccounts document in plaintext -
 * only the salted hash lands in schools/{id}/secrets/{staffPasscodeSecretId}.
 */
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
    const schoolId = typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const accountId = typeof body?.accountId === 'string' ? body.accountId.trim() : '';
    const passcode = typeof body?.passcode === 'string' ? body.passcode.trim() : '';

    if (!bearer || !schoolId || !SCHOOL_ID_RE.test(schoolId) || !accountId || !ACCOUNT_ID_RE.test(accountId) || !passcode) {
      return jsonError(400, 'idToken, schoolId, accountId and passcode are required.');
    }

    const auth = await getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(bearer, true);

    const scopes = await resolveSchoolGateScopes(decoded.uid, schoolId);
    const canManageStaff = scopes.includes('admin') || scopes.includes('office') || scopes.includes('dev');
    if (!canManageStaff) {
      return jsonError(403, 'Only school admin or office staff can set office staff passcodes.');
    }

    const db = await getFirebaseAdminFirestore();
    await writePasscodeSecret(db, schoolId, staffPasscodeSecretId(accountId), passcode);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[api/office/staff-passcode] POST failed:', e);
    return jsonError(503, 'Could not set staff passcode. Check Firebase Admin credentials.');
  }
}
