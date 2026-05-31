import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit } from '@/lib/server/apiSecurity';
import {
  PARENT_PORTAL_COOKIE_NAME,
  verifyParentPortalSession,
} from '@/lib/parentPortal/parentPortalSession';
import type { ParentPortalDashboard } from '@/lib/parentPortal/parentPortalClient';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;

async function getDb() {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  return admin.firestore();
}

function startOfLocalDayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** GET: read-only dashboard for signed-in parent. */
export async function GET(req: NextRequest) {
  try {
    if (!rateLimit(`parent-portal:dashboard:${clientIp(req)}`, 60)) {
      return jsonError(429, 'Too many requests');
    }

    const schoolId = (req.nextUrl.searchParams.get('schoolId') || '').trim().toLowerCase();
    if (!schoolId || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'schoolId is required.');
    }

    const raw = req.cookies.get(PARENT_PORTAL_COOKIE_NAME)?.value;
    if (!raw) return jsonError(401, 'Not signed in.');

    const session = await verifyParentPortalSession(raw);
    if (!session || session.schoolId !== schoolId) {
      return jsonError(401, 'Session expired. Sign in again.');
    }

    const db = await getDb();
    const studentRef = db.collection('schools').doc(schoolId).collection('students').doc(session.studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) return jsonError(404, 'Student not found.');

    const student = studentSnap.data() as {
      firstName?: string;
      lastName?: string;
      nickname?: string;
      points?: number;
      classId?: string;
    };
    const displayName =
      [student.nickname || student.firstName || 'Student', student.lastName || ''].filter(Boolean).join(' ').trim() ||
      session.studentId;

    let className: string | undefined;
    if (student.classId) {
      const classSnap = await db.collection('schools').doc(schoolId).collection('classes').doc(student.classId).get();
      if (classSnap.exists) className = String(classSnap.data()?.name || '');
    }

    const activitiesSnap = await studentRef
      .collection('activities')
      .orderBy('date', 'desc')
      .limit(25)
      .get();
    const recentActivity = activitiesSnap.docs.map((d) => {
      const row = d.data() as { desc?: string; amount?: number; date?: number };
      return {
        desc: String(row.desc || 'Activity'),
        amount: Number(row.amount || 0),
        date: Number(row.date || 0),
      };
    });

    const notesSnap = await db
      .collection('schools')
      .doc(schoolId)
      .collection('behaviorNotes')
      .where('studentId', '==', session.studentId)
      .limit(40)
      .get();

    const behaviorNotes = notesSnap.docs
      .map((d) => {
        const row = d.data() as Record<string, unknown>;
        return {
          kind: String(row.kind || 'concern'),
          note: String(row.note || ''),
          createdAt: Number(row.createdAt || 0),
          teacherName: String(row.teacherName || 'Staff'),
          pointsLabel: row.pointsLabel ? String(row.pointsLabel) : undefined,
          pointsAmount: row.pointsAmount != null ? Number(row.pointsAmount) : undefined,
          visibleToParent: row.visibleToParent === true,
        };
      })
      .filter((n) => n.visibleToParent)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 30)
      .map(({ visibleToParent: _v, ...rest }) => rest);

    const dayStart = startOfLocalDayMs();
    const attendanceSnap = await db
      .collection('schools')
      .doc(schoolId)
      .collection('attendanceLog')
      .where('studentId', '==', session.studentId)
      .orderBy('signedInAt', 'desc')
      .limit(5)
      .get()
      .catch(() => null);

    let attendanceToday: ParentPortalDashboard['attendanceToday'];
    if (attendanceSnap) {
      const todayEntry = attendanceSnap.docs.find((d) => Number(d.data().signedInAt || 0) >= dayStart);
      if (todayEntry) {
        const row = todayEntry.data() as { signedInAt?: number; onTime?: boolean };
        attendanceToday = {
          signedIn: true,
          onTime: row.onTime !== false,
          signedInAt: Number(row.signedInAt || 0),
        };
      } else {
        attendanceToday = { signedIn: false };
      }
    }

    const payload: ParentPortalDashboard = {
      student: {
        id: session.studentId,
        displayName,
        points: Number(student.points || 0),
        className,
      },
      recentActivity,
      behaviorNotes,
      attendanceToday,
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error('[api/parent-portal/dashboard] GET failed:', e);
    return jsonError(503, 'Could not load dashboard.');
  }
}
