import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';
import { verifyStaffForSchoolApi } from '@/lib/server/verifyStaffForSchoolApi';
import { applyClassroomPointsAdmin, applyRewardsPointsAdmin } from '@/lib/server/classroomPointsAdmin';
import {
  firebaseAdminCredentialProjectMismatch,
  hasFirebaseAdminCredentials,
} from '@/lib/server/firebaseAdminAuth';
import { isClassroomPillarOn, isRewardsPillarOn } from '@/lib/productPillars';
import { evaluateClassroomAlertRulesAfterAward } from '@/lib/server/classroomAlertRulesEvaluator';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_STUDENTS = 120;

async function getDb() {
  return getFirebaseAdminFirestore();
}

/** POST: record classroom points (Rewards-off / classroom balance) via Admin SDK. */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`classroom:award:${clientIp(req)}`, 120)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const body = await req.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken.trim() : '';
    const schoolId =
      typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const studentIds = Array.isArray(body?.studentIds)
      ? (body.studentIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : [];
    const signedDelta = Number(body?.signedDelta);
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const teacherId = typeof body?.teacherId === 'string' ? body.teacherId.trim() : 'staff';
    const teacherName = typeof body?.teacherName === 'string' ? body.teacherName.trim() : 'Staff';
    const classId = typeof body?.classId === 'string' ? body.classId.trim() : undefined;
    const className = typeof body?.className === 'string' ? body.className.trim() : undefined;
    const rewardsMode = body?.rewardsMode === true;

    if (!schoolId || !SCHOOL_ID_RE.test(schoolId) || !description) {
      return jsonError(400, 'schoolId and description are required.');
    }
    if (!studentIds.length || studentIds.length > MAX_STUDENTS) {
      return jsonError(400, 'studentIds must include 1–120 students.');
    }
    if (!signedDelta || !Number.isFinite(signedDelta)) {
      return jsonError(400, 'signedDelta must be a non-zero number.');
    }

    const session = await verifyStaffForSchoolApi(req, schoolId, {
      idToken: idToken || undefined,
    });
    if (!session) {
      return jsonError(
        403,
        'Could not verify staff access for this school. Sign out, sign in again as Admin for this school, then refresh once.',
      );
    }

    const credentialMismatch = firebaseAdminCredentialProjectMismatch();
    if (credentialMismatch) {
      return jsonError(503, credentialMismatch);
    }
    if (!hasFirebaseAdminCredentials()) {
      return jsonError(
        503,
        'Server Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_KEY for this Firebase project to .env.local and restart npm run dev.',
      );
    }

    const db = await getDb();
    const schoolSnap = await db.collection('schools').doc(schoolId).get();
    if (!schoolSnap.exists) return jsonError(404, 'School not found.');

    const appSettings = (schoolSnap.data()?.appSettings || {}) as {
      payClassroom?: boolean;
      payRewards?: boolean;
      enableHouses?: boolean;
      housePointsSource?: string;
      housesRollupPoints?: boolean;
    };
    if (!isClassroomPillarOn(appSettings)) {
      return jsonError(403, 'Classroom Management is not enabled for this school.');
    }

    const meta = {
      classId,
      className,
      teacherId,
      teacherName,
    };

    const result = rewardsMode
      ? await (async () => {
          if (!isRewardsPillarOn(appSettings)) {
            return { success: false, message: 'Rewards is not enabled for this school.', count: 0 };
          }
          const rollupHousePoints =
            appSettings.enableHouses === true &&
            (appSettings.housePointsSource === 'studentRollup' ||
              (appSettings.housePointsSource !== 'manual' &&
                appSettings.housesRollupPoints !== false));
          return applyRewardsPointsAdmin(
            db,
            schoolId,
            studentIds,
            signedDelta,
            description,
            meta,
            { rollupHousePoints },
          );
        })()
      : await applyClassroomPointsAdmin(
          db,
          schoolId,
          studentIds,
          signedDelta,
          description,
          meta,
        );

    if (!result.success) {
      return jsonError(400, result.message);
    }

    if (!rewardsMode && result.count > 0) {
      const nameEntries: [string, string][] = [];
      for (const id of studentIds) {
        const snap = await db.collection('schools').doc(schoolId).collection('students').doc(id).get();
        if (!snap.exists) continue;
        const data = snap.data()!;
        const name =
          [data.nickname || data.firstName, data.lastName].filter(Boolean).join(' ').trim() || id;
        nameEntries.push([id, name]);
      }
      void evaluateClassroomAlertRulesAfterAward(
        db,
        schoolId,
        appSettings,
        studentIds,
        Object.fromEntries(nameEntries),
        meta,
      ).catch((e) => console.error('[api/classroom/award] alert rules:', e));
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('[api/classroom/award] POST failed:', e);
    return jsonError(503, 'Could not save classroom points.');
  }
}
