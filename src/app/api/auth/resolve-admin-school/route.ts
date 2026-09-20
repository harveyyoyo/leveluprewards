import { NextRequest, NextResponse } from 'next/server';
import {
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
} from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { listAdminSchoolsForGoogleUser } from '@/lib/server/resolveAdminSchool';

/**
 * POST: schools that list this Google account on adminEmails.
 * Returns `{ schools, schoolId }` — schoolId is set only when exactly one school matches
 * (kept for older clients).
 */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`resolve-admin-school:${clientIp(req)}`, 30)) {
      return jsonError(429, 'Too many requests');
    }

    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) {
      return jsonError(400, 'idToken is required.');
    }

    const auth = await getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const db = await getFirebaseAdminFirestore();

    const schools = await listAdminSchoolsForGoogleUser(db, {
      uid: decoded.uid,
      email: String(decoded.email ?? ''),
      firebase: decoded.firebase as Record<string, unknown> | undefined,
    });
    const schoolId = schools.length === 1 ? schools[0]!.id : null;

    return NextResponse.json({ schools, schoolId });
  } catch (e) {
    console.error('[api/auth/resolve-admin-school] POST failed:', e);
    return NextResponse.json({ schools: [], schoolId: null });
  }
}
