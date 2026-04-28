import { NextResponse } from 'next/server';
import { isFeatureAllowed, type SchoolPlanConfig } from '@/lib/plans';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;

/**
 * Ensures the school’s plan allows AI prize surprise and the setting is on in `appSettings`.
 * Returns a NextResponse when the request must be rejected; otherwise null.
 *
 * Set `SKIP_PRIZE_AI_SERVER_PLAN_CHECK=1` only for local/dev when Firebase Admin credentials are unavailable.
 */
export async function assertPrizeAiSurpriseAllowedForSchool(schoolId: string): Promise<Response | null> {
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
      admin.initializeApp();
    }
    const snap = await admin.firestore().collection('schools').doc(sid).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'School not found.' }, { status: 404 });
    }
    const d = snap.data()!;
    const config: SchoolPlanConfig = {
      plan: d.plan as SchoolPlanConfig['plan'],
      featureOverrides: d.featureOverrides as SchoolPlanConfig['featureOverrides'],
    };
    if (!isFeatureAllowed(config, 'enablePrizeAiSurprise')) {
      return NextResponse.json({ error: 'Prize AI surprise is not included in this school plan.' }, { status: 403 });
    }
    const appSettings = d.appSettings as Record<string, unknown> | undefined;
    if (appSettings?.enablePrizeAiSurprise !== true) {
      return NextResponse.json({ error: 'Prize AI surprise is turned off in school settings.' }, { status: 403 });
    }
    return null;
  } catch (e) {
    console.error('assertPrizeAiSurpriseAllowedForSchool:', e);
    return NextResponse.json(
      { error: 'Could not verify school settings for this feature.' },
      { status: 503 },
    );
  }
}
