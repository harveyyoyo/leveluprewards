import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { hasFirebaseAdminCredentials } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { verifyStaffForSchoolApi } from '@/lib/server/verifyStaffForSchoolApi';
import { isClassroomPillarOn } from '@/lib/productPillars';
import type { BehaviorNoteKind } from '@/lib/types';
import { parseBehaviorNoteCreatedAt } from '@/lib/classroom/behaviorNoteTime';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 16 * 1024;
const LIST_LIMIT = 80;
const NOTE_KINDS = new Set<BehaviorNoteKind>(['positive', 'concern', 'incident']);

async function getDb() {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  return admin.firestore();
}

async function staffSession(req: NextRequest, schoolId: string, idToken?: string) {
  return verifyStaffForSchoolApi(req, schoolId, { idToken: idToken || undefined });
}

async function assertClassroomOn(db: Awaited<ReturnType<typeof getDb>>, schoolId: string) {
  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  if (!schoolSnap.exists) return jsonError(404, 'School not found.');
  const appSettings = (schoolSnap.data()?.appSettings || {}) as { payClassroom?: boolean };
  if (!isClassroomPillarOn(appSettings)) {
    return jsonError(403, 'Classroom Management is not enabled for this school.');
  }
  return null;
}

/** GET: staff behavior timeline (Admin SDK). */
export async function GET(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`classroom:behavior-notes:get:${clientIp(req)}`, 120)) {
      return jsonError(429, 'Too many requests');
    }

    const schoolId = (req.nextUrl.searchParams.get('schoolId') || '').trim().toLowerCase();
    if (!schoolId || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'schoolId is required.');
    }

    const idToken = (req.nextUrl.searchParams.get('idToken') || '').trim();
    const session = await staffSession(req, schoolId, idToken);
    if (!session) {
      return jsonError(403, 'Staff access required for this school.');
    }

    if (!hasFirebaseAdminCredentials()) {
      return jsonError(
        503,
        'Server Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local.',
      );
    }

    const db = await getDb();
    const pillarErr = await assertClassroomOn(db, schoolId);
    if (pillarErr) return pillarErr;

    const snap = await db
      .collection('schools')
      .doc(schoolId)
      .collection('behaviorNotes')
      .orderBy('createdAt', 'desc')
      .limit(LIST_LIMIT)
      .get();

    const notes = snap.docs.map((d) => {
      const row = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        studentId: String(row.studentId || ''),
        studentName: String(row.studentName || ''),
        classId: row.classId ? String(row.classId) : undefined,
        className: row.className ? String(row.className) : undefined,
        teacherId: String(row.teacherId || ''),
        teacherName: String(row.teacherName || ''),
        kind: NOTE_KINDS.has(row.kind as BehaviorNoteKind) ? row.kind : 'concern',
        note: String(row.note || ''),
        createdAt: parseBehaviorNoteCreatedAt(row.createdAt),
        visibleToParent: row.visibleToParent !== false,
        pointsAmount: row.pointsAmount != null ? Number(row.pointsAmount) : undefined,
        pointsLabel: row.pointsLabel ? String(row.pointsLabel) : undefined,
      };
    });

    return NextResponse.json(
      { notes },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch (e) {
    console.error('[api/classroom/behavior-notes] GET failed:', e);
    return jsonError(503, 'Could not load behavior notes.');
  }
}

/** POST: create a behavior note (Admin SDK). */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`classroom:behavior-notes:post:${clientIp(req)}`, 60)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const body = await req.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken.trim() : '';
    const schoolId =
      typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : '';
    const studentName = typeof body?.studentName === 'string' ? body.studentName.trim() : '';
    const teacherId = typeof body?.teacherId === 'string' ? body.teacherId.trim() : 'staff';
    const teacherName = typeof body?.teacherName === 'string' ? body.teacherName.trim() : 'Staff';
    const kind = typeof body?.kind === 'string' ? body.kind : 'concern';
    const note = typeof body?.note === 'string' ? body.note.trim() : '';
    const classId = typeof body?.classId === 'string' ? body.classId.trim() : undefined;
    const className = typeof body?.className === 'string' ? body.className.trim() : undefined;
    const visibleToParent =
      body?.visibleToParent === true || (kind !== 'incident' && body?.visibleToParent !== false);
    const pointsAmount = body?.pointsAmount != null ? Number(body.pointsAmount) : null;
    const pointsLabel = typeof body?.pointsLabel === 'string' ? body.pointsLabel.trim() : null;

    if (!schoolId || !SCHOOL_ID_RE.test(schoolId) || !studentId || !studentName || !note) {
      return jsonError(400, 'schoolId, studentId, studentName, and note are required.');
    }
    if (studentId.includes('/')) {
      return jsonError(400, 'Invalid student id.');
    }
    if (!NOTE_KINDS.has(kind as BehaviorNoteKind)) {
      return jsonError(400, 'Invalid note kind.');
    }

    const session = await staffSession(req, schoolId, idToken);
    if (!session) {
      return jsonError(403, 'Staff access required for this school.');
    }

    if (!hasFirebaseAdminCredentials()) {
      return jsonError(
        503,
        'Server Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local.',
      );
    }

    const db = await getDb();
    const pillarErr = await assertClassroomOn(db, schoolId);
    if (pillarErr) return pillarErr;

    const now = Date.now();
    const ref = await db.collection('schools').doc(schoolId).collection('behaviorNotes').add({
      studentId,
      studentName,
      classId: classId ?? null,
      className: className ?? null,
      teacherId,
      teacherName,
      kind,
      note,
      createdAt: now,
      visibleToParent: kind === 'incident' ? visibleToParent : true,
      pointsAmount: pointsAmount != null && Number.isFinite(pointsAmount) ? pointsAmount : null,
      pointsLabel: pointsLabel || null,
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e) {
    console.error('[api/classroom/behavior-notes] POST failed:', e);
    return jsonError(503, 'Could not save behavior note.');
  }
}
