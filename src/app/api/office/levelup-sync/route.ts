import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, type Firestore, type WriteBatch } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '@/lib/server/firebaseAdminAuth';
import { checkDeveloperAllowlist, checkSchoolRole, sameOriginCheck, verifyIdToken } from '@/lib/server/kioskSnapshotAuth';
import {
  OFFICE_SYNC_MODES,
  describeStudentSyncPlan,
  planStudentSync,
  type OfficeLevelUpSyncSettings,
  type OfficeSyncMode,
  type StudentSyncPlan,
  type SyncClass,
  type SyncLevelUpStudent,
  type SyncOfficeStudent,
} from '@/lib/office/officeLevelUpSync';

export const dynamic = 'force-dynamic';

/**
 * Settings → levelUp sync: keeps the Office's records and levelUp's the same, in the direction
 * each school chose (see officeLevelUpSync.ts for the rules).
 *
 * - `preview`: what turning a direction on would change, before anything is written.
 * - `run`: brings everything that's switched on up to date. The Office calls it when it opens,
 *   after its records change, and every few minutes while it's open; running it again when
 *   nothing changed writes nothing.
 */

const MAX_BODY_BYTES = 4 * 1024;
/** One run at a time per school, so two open screens can't both add the same student. */
const LOCK_MS = 60_000;
const SYNCED_BY = 'levelUp sync';

class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Body = Record<string, unknown>;

function schoolIdFrom(body: Body): string {
  const value = typeof body.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
  if (!/^[a-z0-9_-]{1,80}$/.test(value)) throw new HttpError('A valid school is required.', 400);
  return value;
}

function modeFrom(value: unknown): OfficeSyncMode {
  if (OFFICE_SYNC_MODES.some((m) => m.id === value)) return value as OfficeSyncMode;
  throw new HttpError('Pick how to share.', 400);
}

/** School Office staff and school admins (and developers) only. */
async function authenticate(req: NextRequest, schoolId: string): Promise<Firestore> {
  if (!sameOriginCheck(req)) throw new HttpError('Forbidden', 403);
  const authHeader = req.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const verified = idToken ? await verifyIdToken(idToken) : null;
  if (!idToken || !verified) throw new HttpError('Sign in again.', 401);
  const [isDeveloper, hasSchoolRole] = await Promise.all([
    checkDeveloperAllowlist(idToken, verified.uid),
    checkSchoolRole(idToken, verified.uid, schoolId),
  ]);
  if (!isDeveloper && !hasSchoolRole) throw new HttpError('Forbidden', 403);
  let db: Firestore;
  try {
    db = getFirestore(await getFirebaseAdminApp());
  } catch {
    throw new HttpError('Sharing with levelUp is not set up on this server yet.', 503);
  }
  if (!isDeveloper) {
    const schoolRef = db.collection('schools').doc(schoolId);
    const [officeRole, adminRole] = await Promise.all([
      schoolRef.collection('roles_office').doc(verified.uid).get(),
      schoolRef.collection('roles_admin').doc(verified.uid).get(),
    ]);
    const allowed = (officeRole.exists && officeRole.data()?.role === 'office') || (adminRole.exists && adminRole.data()?.role === 'admin');
    if (!allowed) throw new HttpError('Only School Office staff can change sharing with levelUp.', 403);
  }
  return db;
}

async function loadStudentData(db: Firestore, schoolId: string) {
  const school = db.collection('schools').doc(schoolId);
  const [officeStudents, levelUpStudents, officeClasses, levelUpClasses] = await Promise.all([
    school.collection('officeStudents').get(),
    school.collection('students').get(),
    school.collection('officeClasses').get(),
    school.collection('classes').get(),
  ]);
  const rows = <T,>(snap: FirebaseFirestore.QuerySnapshot) => snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
  return {
    officeStudents: rows<SyncOfficeStudent>(officeStudents),
    levelUpStudents: rows<SyncLevelUpStudent>(levelUpStudents),
    officeClasses: rows<SyncClass & { archived?: boolean }>(officeClasses).filter((c) => !c.archived),
    levelUpClassDocs: rows<SyncClass & { primaryTeacherId?: string; teacherIds?: string[] }>(levelUpClasses),
  };
}

function classTeacherIds(cls: { primaryTeacherId?: string; teacherIds?: string[] } | undefined): string[] {
  if (!cls) return [];
  const ids = new Set<string>();
  if (cls.primaryTeacherId?.trim()) ids.add(cls.primaryTeacherId.trim());
  for (const id of cls.teacherIds ?? []) if (typeof id === 'string' && id.trim()) ids.add(id.trim());
  return [...ids];
}

/** Writes in batches (Firestore allows 500 writes per batch). */
class Writer {
  private batch: WriteBatch;
  private count = 0;
  private done: Promise<unknown>[] = [];
  constructor(private db: Firestore) {
    this.batch = db.batch();
  }
  add(fn: (b: WriteBatch) => void) {
    fn(this.batch);
    this.count += 1;
    if (this.count >= 450) {
      this.done.push(this.batch.commit());
      this.batch = this.db.batch();
      this.count = 0;
    }
  }
  async commit() {
    if (this.count) this.done.push(this.batch.commit());
    await Promise.all(this.done);
  }
}

async function applyStudentPlan(
  db: Firestore,
  schoolId: string,
  plan: StudentSyncPlan,
  levelUpClassDocs: Array<SyncClass & { primaryTeacherId?: string; teacherIds?: string[] }>,
  existingLevelUpIds: Set<string>,
) {
  const school = db.collection('schools').doc(schoolId);
  const now = Date.now();
  const classById = new Map(levelUpClassDocs.map((c) => [c.id, c]));
  const w = new Writer(db);

  for (const { officeId, levelUpId } of plan.links) {
    w.add((b) => b.set(school.collection('officeStudents').doc(officeId), { levelUpId }, { merge: true }));
    w.add((b) => b.set(school.collection('students').doc(levelUpId), { officeId }, { merge: true }));
  }
  for (const { levelUpId, fields } of plan.updateLevelUp) {
    const cls = fields.classId ? classById.get(fields.classId) : undefined;
    const teacherIds = classTeacherIds(cls);
    w.add((b) =>
      b.set(
        school.collection('students').doc(levelUpId),
        {
          firstName: fields.firstName,
          lastName: fields.lastName,
          nickname: fields.nickname,
          classId: fields.classId,
          ...(teacherIds.length ? { teacherIds } : {}),
          updatedAt: now,
        },
        { merge: true },
      ),
    );
  }
  for (const { officeId, fields } of plan.updateOffice) {
    w.add((b) =>
      b.set(
        school.collection('officeStudents').doc(officeId),
        { firstName: fields.firstName, lastName: fields.lastName, nickname: fields.nickname, classId: fields.classId, updatedAt: now, updatedBy: SYNCED_BY },
        { merge: true },
      ),
    );
  }
  for (const { officeId, fields } of plan.createInLevelUp) {
    // levelUp student ids double as the card/scanner number: 8 digits, like the Admin screen makes.
    let id = '';
    do id = Math.floor(10000000 + Math.random() * 90000000).toString();
    while (existingLevelUpIds.has(id));
    existingLevelUpIds.add(id);
    const cls = fields.classId ? classById.get(fields.classId) : undefined;
    const teacherIds = classTeacherIds(cls);
    const student = {
      id,
      nfcId: id,
      firstName: fields.firstName,
      lastName: fields.lastName,
      ...(fields.nickname ? { nickname: fields.nickname } : {}),
      ...(fields.classId ? { classId: fields.classId } : {}),
      ...(teacherIds.length ? { teacherIds } : {}),
      officeId,
      createdAt: now,
      updatedAt: now,
      points: 0,
      lifetimePoints: 0,
      categoryPoints: {},
      pointsByPeriod: {},
      categoryPointsByPeriod: {},
      earnedAchievements: [],
      earnedBadges: [],
    };
    w.add((b) => b.create(school.collection('students').doc(id), student));
    w.add((b) => b.set(school.collection('officeStudents').doc(officeId), { levelUpId: id }, { merge: true }));
  }
  for (const { levelUpId, fields } of plan.createInOffice) {
    const ref = school.collection('officeStudents').doc();
    w.add((b) =>
      b.create(ref, {
        firstName: fields.firstName,
        lastName: fields.lastName,
        nickname: fields.nickname,
        classId: fields.classId,
        teacherId: null,
        teacherName: null,
        photoUrl: null,
        dateOfBirth: null,
        busRoute: null,
        notes: null,
        familyId: null,
        status: 'active',
        levelUpId,
        updatedAt: now,
        updatedBy: SYNCED_BY,
      }),
    );
    w.add((b) => b.set(school.collection('students').doc(levelUpId), { officeId: ref.id }, { merge: true }));
  }
  await w.commit();

  const changed =
    plan.links.length + plan.createInLevelUp.length + plan.createInOffice.length + plan.updateLevelUp.length + plan.updateOffice.length;
  if (changed) {
    // One line in Reports → Change history for each run that changed something.
    await school.collection('officeAuditLog').add({
      entityType: 'officeStudent',
      entityId: 'levelup-sync',
      action: 'update',
      summary: `levelUp sync: ${describeStudentSyncPlan(plan).join(' ')}`,
      before: null,
      after: null,
      changedBy: SYNCED_BY,
      changedAt: now,
    });
  }
}

async function withLock<T>(db: Firestore, schoolId: string, fn: () => Promise<T>): Promise<T | null> {
  const lockRef = db.collection('schools').doc(schoolId).collection('officeSync').doc('lock');
  const got = await db.runTransaction(async (tx) => {
    const snap = await tx.get(lockRef);
    const until = (snap.data()?.until as number | undefined) ?? 0;
    if (until > Date.now()) return false;
    tx.set(lockRef, { until: Date.now() + LOCK_MS });
    return true;
  });
  if (!got) return null;
  try {
    return await fn();
  } finally {
    await lockRef.delete().catch(() => undefined);
  }
}

async function readSyncSettings(db: Firestore, schoolId: string): Promise<OfficeLevelUpSyncSettings> {
  const snap = await db.collection('schools').doc(schoolId).collection('officeSettings').doc('config').get();
  return ((snap.data()?.levelUpSync as OfficeLevelUpSyncSettings | undefined) ?? {}) as OfficeLevelUpSyncSettings;
}

export async function POST(req: NextRequest) {
  if (Number(req.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 413 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  try {
    const schoolId = schoolIdFrom(body ?? {});
    const db = await authenticate(req, schoolId);

    if (body.action === 'preview') {
      if (body.item !== 'students') throw new HttpError('That part of sharing isn’t ready yet.', 400);
      const mode = modeFrom(body.mode);
      const data = await loadStudentData(db, schoolId);
      const plan = planStudentSync({ mode, ...data, levelUpClasses: data.levelUpClassDocs });
      return NextResponse.json({ lines: describeStudentSyncPlan(plan) });
    }

    if (body.action === 'run') {
      const settings = await readSyncSettings(db, schoolId);
      const mode = settings.students ?? 'off';
      if (mode === 'off') return NextResponse.json({ ran: false });
      const result = await withLock(db, schoolId, async () => {
        const data = await loadStudentData(db, schoolId);
        const plan = planStudentSync({ mode, ...data, levelUpClasses: data.levelUpClassDocs });
        await applyStudentPlan(db, schoolId, plan, data.levelUpClassDocs, new Set(data.levelUpStudents.map((s) => s.id)));
        return describeStudentSyncPlan(plan);
      });
      return NextResponse.json(result ? { ran: true, lines: result } : { ran: false, busy: true });
    }

    throw new HttpError('Unknown request.', 400);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error('office levelup sync', error);
    const message = error instanceof HttpError ? error.message : 'Sharing with levelUp didn’t work this time. Try again in a moment.';
    return NextResponse.json({ error: message }, { status });
  }
}
