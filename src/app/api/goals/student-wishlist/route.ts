import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, sameOriginCheck } from '@/lib/server/kioskSnapshotAuth';
import {
  getFirebaseAdminFirestore,
  hasFirebaseAdminCredentials,
  firebaseAdminCredentialProjectMismatch,
} from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit } from '@/lib/server/apiSecurity';
import { titleForPrizeSavings } from '@/lib/goals/goalHelpers';

export const dynamic = 'force-dynamic';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 16 * 1024;

async function checkKioskMember(idToken: string, schoolId: string, uid: string): Promise<boolean> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return false;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/databases/(default)/documents/schools/${encodeURIComponent(schoolId)}/kioskMembers/${encodeURIComponent(uid)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkStudentPortalSession(
  idToken: string,
  schoolId: string,
  uid: string,
): Promise<boolean> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return false;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/databases/(default)/documents/schools/${encodeURIComponent(schoolId)}/studentPortalSessions/${encodeURIComponent(uid)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * POST: create or replace a student savings wishlist goal (prize_savings).
 * DELETE body action via `{ action: "clear" }` removes active student wishlist goals for that prize/student.
 */
export async function POST(req: NextRequest) {
  try {
    if (!sameOriginCheck(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`goals:wishlist:${clientIp(req)}`, 60)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const authHeader = req.headers.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    if (!match) return jsonError(401, 'Authentication required.');
    const idToken = match[1]!;
    const verified = await verifyIdToken(idToken);
    if (!verified) return jsonError(401, 'Invalid or expired session.');

    const body = await req.json();
    const schoolId =
      typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : '';
    const prizeId = typeof body?.prizeId === 'string' ? body.prizeId.trim() : '';
    const action = body?.action === 'clear' ? 'clear' : 'set';

    if (!schoolId || !SCHOOL_ID_RE.test(schoolId) || !studentId) {
      return jsonError(400, 'schoolId and studentId are required.');
    }

    const isPortal = await checkStudentPortalSession(idToken, schoolId, verified.uid);
    const isKiosk = !isPortal && (await checkKioskMember(idToken, schoolId, verified.uid));
    if (!isPortal && !isKiosk) {
      return jsonError(403, 'Kiosk or student home access required.');
    }
    if (isPortal && verified.uid !== studentId) {
      return jsonError(403, 'You can only set a wishlist for your own account.');
    }

    const credentialMismatch = firebaseAdminCredentialProjectMismatch();
    if (credentialMismatch) return jsonError(503, credentialMismatch);
    if (!hasFirebaseAdminCredentials()) {
      return jsonError(503, 'Server Firebase Admin is not configured.');
    }

    const db = await getFirebaseAdminFirestore();
    const schoolRef = db.collection('schools').doc(schoolId);
    const schoolSnap = await schoolRef.get();
    if (!schoolSnap.exists) return jsonError(404, 'School not found.');

    const appSettings = (schoolSnap.data()?.appSettings || {}) as { enableGoals?: boolean };
    if (appSettings.enableGoals !== true) {
      return jsonError(403, 'Goals are not turned on for this school.');
    }

    const studentSnap = await schoolRef.collection('students').doc(studentId).get();
    if (!studentSnap.exists) return jsonError(404, 'Student not found.');

    const goalsCol = schoolRef.collection('goals');
    const existingSnap = await goalsCol.where('studentId', '==', studentId).get();
    const wishlistDocs = existingSnap.docs.filter((d) => {
      const data = d.data() as { type?: string; status?: string; createdByStudent?: boolean; prizeId?: string };
      return data.type === 'prize_savings' && data.status === 'active' && data.createdByStudent === true;
    });

    if (action === 'clear') {
      const batch = db.batch();
      for (const d of wishlistDocs) {
        if (!prizeId || d.data()?.prizeId === prizeId) {
          batch.delete(d.ref);
        }
      }
      await batch.commit();
      return NextResponse.json({ ok: true, cleared: true });
    }

    if (!prizeId) return jsonError(400, 'prizeId is required.');

    const prizeSnap = await schoolRef.collection('prizes').doc(prizeId).get();
    if (!prizeSnap.exists) return jsonError(404, 'Reward not found.');
    const prize = prizeSnap.data() as { name?: string; points?: number };
    const targetPoints = Math.max(1, Number(prize.points ?? 0) || 1);
    const title = titleForPrizeSavings({ name: prize.name || 'reward' });

    const batch = db.batch();
    // One active student wishlist at a time — replace older wishlist goals.
    for (const d of wishlistDocs) {
      batch.delete(d.ref);
    }
    const ref = goalsCol.doc();
    batch.set(ref, {
      id: ref.id,
      type: 'prize_savings',
      title,
      description: 'Saving toward a shop reward.',
      targetPoints,
      studentId,
      prizeId,
      status: 'active',
      createdAt: Date.now(),
      createdByStudent: true,
    });
    await batch.commit();

    return NextResponse.json({ ok: true, goalId: ref.id, title, targetPoints });
  } catch (e) {
    console.error('[api/goals/student-wishlist] failed:', e);
    return jsonError(503, 'Could not update wishlist.');
  }
}
