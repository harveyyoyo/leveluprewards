import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import { BodyTooLargeError, clientIp, jsonError, rateLimit, readJsonBodyWithLimit, sameOrigin } from '@/lib/server/apiSecurity';
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
    if (!rateLimit(`office-staff-passcode-set:${clientIp(req)}`, 30)) {
      return jsonError(429, 'Too many requests');
    }

    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    let rawBody: unknown;
    try {
      rawBody = await readJsonBodyWithLimit(req, MAX_BODY_BYTES);
    } catch (e) {
      if (e instanceof BodyTooLargeError) return jsonError(413, 'Body too large');
      return jsonError(400, 'Invalid request body');
    }
    const body = rawBody as { schoolId?: unknown; accountId?: unknown; passcode?: unknown };
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

    // staffAccounts is a collection shared with the Rewards app (secretary/prizeClerk/
    // reports/librarian/houseCoordinator desk roles live there too) - an office/admin
    // caller for this school must only ever be able to set the passcode on an
    // office-role account. If the id already belongs to some other role, refuse; if it
    // doesn't exist yet, this is a brand-new office account being created and is fine.
    const accountSnap = await db
      .collection('schools')
      .doc(schoolId)
      .collection('staffAccounts')
      .doc(accountId)
      .get();
    if (accountSnap.exists) {
      const data = accountSnap.data() as { role?: string; roles?: string[] } | undefined;
      const roles = data?.roles?.length ? data.roles : [data?.role];
      if (!roles.includes('office')) {
        return jsonError(403, 'That account is not a School Office staff account.');
      }
    }

    await writePasscodeSecret(db, schoolId, staffPasscodeSecretId(accountId), passcode);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[api/office/staff-passcode] POST failed:', e);
    return jsonError(503, 'Could not set staff passcode. Check Firebase Admin credentials.');
  }
}
