import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit, sameOrigin } from '@/lib/server/apiSecurity';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;
const MAX_BODY_BYTES = 8 * 1024;

type JsonRecord = Record<string, unknown>;

function jsonSafe(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value !== 'object') return value;
  if (typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (Array.isArray(value)) return value.map(jsonSafe);

  const out: JsonRecord = {};
  for (const [key, child] of Object.entries(value as JsonRecord)) {
    out[key] = jsonSafe(child);
  }
  return out;
}

function docData<T extends JsonRecord>(snap: FirebaseFirestore.DocumentSnapshot): T {
  return { id: snap.id, ...(jsonSafe(snap.data() || {}) as JsonRecord) } as unknown as T;
}

function categoryNameFromId(categories: JsonRecord[], categoryId?: unknown): string | undefined {
  if (typeof categoryId !== 'string' || !categoryId) return undefined;
  const match = categories.find((c) => c.id === categoryId);
  return typeof match?.name === 'string' ? match.name : undefined;
}

async function sumActivitiesInRange(
  db: FirebaseFirestore.Firestore,
  schoolId: string,
  studentId: string,
  startMs: number,
  endMs: number,
  categoryName?: string,
) {
  const snap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('students')
    .doc(studentId)
    .collection('activities')
    .where('date', '>=', startMs)
    .where('date', '<=', endMs)
    .get();

  let sum = 0;
  snap.forEach((doc) => {
    const data = doc.data();
    const amount = typeof data.amount === 'number' ? data.amount : 0;
    if (amount <= 0) return;
    if (categoryName && data.desc !== categoryName) return;
    sum += amount;
  });
  return sum;
}

async function goalProgress(
  db: FirebaseFirestore.Firestore,
  schoolId: string,
  goal: JsonRecord,
  student: JsonRecord,
  roster: JsonRecord[],
  categories: JsonRecord[],
) {
  const now = Date.now();
  if (goal.status !== 'active') return 0;
  const startDate = typeof goal.startDate === 'number' ? goal.startDate : undefined;
  const endDate = typeof goal.endDate === 'number' ? goal.endDate : undefined;
  if (startDate && now < startDate) return 0;
  if (endDate && now > endDate) return 0;

  const categoryName = categoryNameFromId(categories, goal.categoryId);
  const rangeStart = startDate ?? 0;
  const rangeEnd = endDate ?? now;
  const useActivityRange = startDate != null || endDate != null;
  const studentId = String(student.id || '');

  if (goal.type === 'prize_savings') {
    return goal.studentId === studentId ? Math.max(0, Number(student.points || 0)) : 0;
  }

  if (goal.type === 'class') {
    const classRoster = roster.filter((s) => s.classId === goal.classId);
    if (goal.categoryId) {
      if (!categoryName) return 0;
      if (useActivityRange) {
        const sums = await Promise.all(
          classRoster.map((s) => sumActivitiesInRange(db, schoolId, String(s.id), rangeStart, rangeEnd, categoryName)),
        );
        return sums.reduce((a, b) => a + b, 0);
      }
      return classRoster.reduce((acc, s) => {
        const categoryPoints = (s.categoryPoints || {}) as Record<string, number>;
        return acc + Number(categoryPoints[categoryName] || 0);
      }, 0);
    }
    if (useActivityRange) {
      const sums = await Promise.all(
        classRoster.map((s) => sumActivitiesInRange(db, schoolId, String(s.id), rangeStart, rangeEnd)),
      );
      return sums.reduce((a, b) => a + b, 0);
    }
    return classRoster.reduce((acc, s) => acc + Number(s.lifetimePoints ?? s.points ?? 0), 0);
  }

  if (goal.studentId !== studentId) return 0;
  if (goal.categoryId) {
    if (!categoryName) return 0;
    if (useActivityRange) return sumActivitiesInRange(db, schoolId, studentId, rangeStart, rangeEnd, categoryName);
    const categoryPoints = (student.categoryPoints || {}) as Record<string, number>;
    return Number(categoryPoints[categoryName] || 0);
  }
  if (useActivityRange) return sumActivitiesInRange(db, schoolId, studentId, rangeStart, rangeEnd);
  return Number(student.lifetimePoints ?? student.points ?? 0);
}

export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) return jsonError(403, 'Forbidden');
    if (!rateLimit(`student-portal:dashboard:${clientIp(req)}`, 60)) {
      return jsonError(429, 'Too many requests');
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(413, 'Body too large');

    const body = await req.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    const schoolId = typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : '';
    if (!idToken || !schoolId || !studentId || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'idToken, schoolId, and studentId are required.');
    }

    const auth = await getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    if (decoded.uid !== studentId || decoded.studentPortal !== true || decoded.schoolId !== schoolId) {
      return jsonError(403, 'Student portal session required.');
    }

    const db = await getFirebaseAdminFirestore();
    const schoolRef = db.collection('schools').doc(schoolId);
    const studentRef = schoolRef.collection('students').doc(studentId);
    const [schoolSnap, studentSnap] = await Promise.all([schoolRef.get(), studentRef.get()]);
    if (!schoolSnap.exists) return jsonError(404, 'School not found.');
    if (!studentSnap.exists) return jsonError(404, 'Student not found.');

    const appSettings = (schoolSnap.data()?.appSettings || {}) as JsonRecord;
    if (appSettings.enableStudentPortal !== true) {
      return jsonError(403, 'Student home portal is not enabled.');
    }

    const student = docData<JsonRecord>(studentSnap);
    const [
      activitiesSnap,
      prizesSnap,
      badgesSnap,
      librarySnap,
      housesSnap,
      goalsSnap,
      categoriesSnap,
    ] = await Promise.all([
      studentRef.collection('activities').orderBy('date', 'desc').limit(25).get(),
      schoolRef.collection('prizes').get(),
      schoolRef.collection('badges').get(),
      schoolRef.collection('library').where('checkedOutTo', '==', studentId).get(),
      schoolRef.collection('houses').get(),
      schoolRef.collection('goals').get(),
      schoolRef.collection('categories').get(),
    ]);

    const activities = activitiesSnap.docs.map((snap) => docData<JsonRecord>(snap));
    const prizes = prizesSnap.docs.map((snap) => docData<JsonRecord>(snap));
    const badges = badgesSnap.docs.map((snap) => docData<JsonRecord>(snap));
    const libraryCheckouts = librarySnap.docs.map((snap) => docData<JsonRecord>(snap));
    const houses = housesSnap.docs.map((snap) => docData<JsonRecord>(snap));
    const categories = categoriesSnap.docs.map((snap) => docData<JsonRecord>(snap));
    const goals = goalsSnap.docs
      .map((snap) => docData<JsonRecord>(snap))
      .filter((goal) => goal.status === 'active' || goal.status === 'completed')
      .filter(
        (goal) =>
          goal.studentId === studentId ||
          (goal.type === 'class' && goal.classId && goal.classId === student.classId),
      );

    const rosterByClass = new Map<string, JsonRecord[]>();
    async function rosterFor(classId: string) {
      if (rosterByClass.has(classId)) return rosterByClass.get(classId)!;
      const snap = await schoolRef.collection('students').where('classId', '==', classId).get();
      const roster = snap.docs.map((doc) => docData<JsonRecord>(doc));
      rosterByClass.set(classId, roster);
      return roster;
    }

    const goalRows = await Promise.all(
      goals.map(async (goal) => {
        const roster = goal.type === 'class' && typeof goal.classId === 'string' ? await rosterFor(goal.classId) : [student];
        return {
          ...goal,
          progress: await goalProgress(db, schoolId, goal, student, roster, categories),
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      student,
      activities,
      prizes,
      badges,
      libraryCheckouts,
      houses,
      goals: goalRows,
    });
  } catch (e) {
    console.error('[api/student-portal/dashboard] POST failed:', e);
    return jsonError(503, 'Could not load student dashboard.');
  }
}
