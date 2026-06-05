import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { deobfuscateField } from '@/lib/crypto';
import { authCookieFlags } from '@/lib/auth/authCookieOptions';
import { lookupStudentIdByBadge } from '@/lib/server/studentPortalDb';
import {
  PARENT_PORTAL_COOKIE_NAME,
  signParentPortalSession,
} from '@/lib/parentPortal/parentPortalSession';
import { isParentPortalOn } from '@/lib/productPillars';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 8 * 1024;

async function getDb() {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  return admin.firestore();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** POST: verify parent email on file and mint parent portal session cookie. */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`parent-portal:verify:${clientIp(req)}`, 20)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const body = await req.json();
    const schoolId =
      typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const studentLookup =
      typeof body?.studentLookup === 'string' ? body.studentLookup.trim() : '';
    const parentEmail =
      typeof body?.parentEmail === 'string' ? body.parentEmail.trim() : '';
    if (!schoolId || !studentLookup || !parentEmail || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'schoolId, studentLookup, and parentEmail are required.');
    }

    const db = await getDb();
    const schoolSnap = await db.collection('schools').doc(schoolId).get();
    if (!schoolSnap.exists) return jsonError(404, 'School not found.');

    const appSettings = (schoolSnap.data()?.appSettings || {}) as Record<string, unknown>;
    if (!isParentPortalOn(appSettings as { payClassroom?: boolean; enableParentView?: boolean })) {
      return jsonError(403, 'Parent portal is not enabled for this school.');
    }

    const studentId = await lookupStudentIdByBadge(db, schoolId, studentLookup);
    if (!studentId) return jsonError(404, 'Student not found. Check the student ID on their card.');

    const studentSnap = await db
      .collection('schools')
      .doc(schoolId)
      .collection('students')
      .doc(studentId)
      .get();
    if (!studentSnap.exists) return jsonError(404, 'Student not found.');

    const student = studentSnap.data() as { parentEmail?: string; notificationPrefs?: { parentEnabled?: boolean } };
    if (student.notificationPrefs?.parentEnabled === false) {
      return jsonError(403, 'Parent notifications are turned off for this student.');
    }

    const onFile = normalizeEmail(deobfuscateField(student.parentEmail) || '');
    const provided = normalizeEmail(parentEmail);
    if (!onFile || onFile !== provided) {
      return jsonError(403, 'Parent email does not match our records. Contact the school office.');
    }

    const token = await signParentPortalSession({ schoolId, studentId });
    if (!token) {
      return jsonError(503, 'Parent portal sessions are not configured on this server.');
    }

    const res = NextResponse.json({ ok: true, studentId });
    res.cookies.set(PARENT_PORTAL_COOKIE_NAME, token, {
      ...authCookieFlags(),
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error('[api/parent-portal/verify] POST failed:', e);
    return jsonError(503, 'Sign-in failed.');
  }
}
