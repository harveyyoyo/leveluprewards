import { NextResponse } from 'next/server';

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
    const mod = await import('firebase-admin');
    const admin = mod.default ?? mod;
    if (!admin.apps?.length) {
      const projectId =
        process.env.FIREBASE_ADMIN_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (projectId) {
        admin.initializeApp({ projectId });
      } else {
        admin.initializeApp();
      }
    }
    const snap = await admin.firestore().collection('schools').doc(sid).get();
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
