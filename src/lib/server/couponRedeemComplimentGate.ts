import { NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from './firebaseAdminAuth';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;

/**
 * Ensures AI coupon redeem compliments are turned on in the school's `appSettings`.
 * Returns a NextResponse when the request must be rejected; otherwise null.
 */
export async function assertCouponRedeemComplimentsAllowedForSchool(
  schoolId: string,
): Promise<Response | null> {
  const sid = schoolId.trim().toLowerCase();
  if (!SCHOOL_ID_RE.test(sid)) {
    return NextResponse.json({ error: 'Invalid school id.' }, { status: 400 });
  }
  if (process.env.SKIP_PRIZE_AI_SERVER_PLAN_CHECK === '1') {
    return null;
  }
  try {
    const db = await getFirebaseAdminFirestore();
    const snap = await db.collection('schools').doc(sid).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'School not found.' }, { status: 404 });
    }
    const d = snap.data()!;
    const appSettings = d.appSettings as Record<string, unknown> | undefined;
    if (appSettings?.enableCouponRedeemCompliments === false) {
      return NextResponse.json(
        { error: 'Coupon redeem compliments are turned off in school settings.' },
        { status: 403 },
      );
    }
    return null;
  } catch (e) {
    console.error('assertCouponRedeemComplimentsAllowedForSchool:', e);
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return NextResponse.json({ error: 'Could not verify school settings.' }, { status: 503 });
  }
}
