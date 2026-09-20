import { NextRequest, NextResponse } from 'next/server';
import {
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
} from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { resolveAdminSchoolForGoogleUser } from '@/lib/server/resolveAdminSchool';

/** POST: which single school (if any) has this Google account on its admin list. */
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

    const schoolId = await resolveAdminSchoolForGoogleUser(db, {
      uid: decoded.uid,
      email: String(decoded.email ?? ''),
      firebase: decoded.firebase as Record<string, unknown> | undefined,
    });

    return NextResponse.json({ schoolId });
  } catch (e) {
    console.error('[api/auth/resolve-admin-school] POST failed:', e);
    return NextResponse.json({ schoolId: null });
  }
}
