import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import { sameOriginCheck, verifyIdToken } from '@/lib/server/kioskSnapshotAuth';
import { hasOfficeTransportRole } from '@/lib/server/officeTransportRole';
import { clientIp, jsonError, rateLimit } from '@/lib/server/apiSecurity';
import {
  TRANSPORT_PARENT_ACCESS_DEFAULT_DAYS,
  TRANSPORT_PARENT_ACCESS_MAX_DAYS,
  transportParentAccessSafeSummary,
  type OfficeTransportParentAccess,
} from '@/lib/office/transportParentAccess';
import type { OfficeFamily, OfficeStudent } from '@/lib/office/types';

export const dynamic = 'force-dynamic';

const SCHOOL_ID_RE = /^[a-z0-9_-]{1,80}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

type Body = Record<string, unknown>;
type AuthContext = { uid: string; db: Awaited<ReturnType<typeof getFirebaseAdminFirestore>> };

function schoolIdFrom(value: unknown): string {
  const schoolId = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!SCHOOL_ID_RE.test(schoolId)) throw new Error('A valid school is required.');
  return schoolId;
}

function idFrom(value: unknown, label: string): string {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!ID_RE.test(id)) throw new Error(`${label} is invalid.`);
  return id;
}

function textFrom(value: unknown, label: string, max = 80): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > max) throw new Error(`${label} is invalid.`);
  return text;
}

function daysFrom(value: unknown): number {
  if (value == null || value === '') return TRANSPORT_PARENT_ACCESS_DEFAULT_DAYS;
  const days = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(days) || days < 1 || days > TRANSPORT_PARENT_ACCESS_MAX_DAYS) {
    throw new Error(`Access days must be between 1 and ${TRANSPORT_PARENT_ACCESS_MAX_DAYS}.`);
  }
  return days;
}

function codeHash(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function noStore() {
  return { 'Cache-Control': 'no-store' };
}

async function authenticate(req: NextRequest, body: Body): Promise<AuthContext> {
  if (!sameOriginCheck(req)) throw new Error('Forbidden');
  const authorization = req.headers.get('authorization') ?? '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const verified = idToken ? await verifyIdToken(idToken) : null;
  if (!idToken || !verified) throw new Error('Unauthorized');
  const schoolId = schoolIdFrom(body.schoolId);
  const db = await getFirebaseAdminFirestore();
  if (!(await hasOfficeTransportRole(db, idToken, verified.uid, schoolId))) throw new Error('Forbidden');
  return { uid: verified.uid, db };
}

function familyDoc(db: AuthContext['db'], schoolId: string, familyId: string) {
  return db.collection('schools').doc(schoolId).collection('officeFamilies').doc(familyId);
}

async function readFamily(
  db: AuthContext['db'],
  schoolId: string,
  familyId: string,
): Promise<OfficeFamily> {
  const snap = await familyDoc(db, schoolId, familyId).get();
  if (!snap.exists || snap.data()?.archived === true) throw new Error('That family was not found.');
  return { id: snap.id, ...snap.data() } as OfficeFamily;
}

async function hasBusRider(db: AuthContext['db'], schoolId: string, familyId: string): Promise<boolean> {
  const snap = await db.collection('schools').doc(schoolId).collection('officeStudents').where('familyId', '==', familyId).limit(200).get();
  return snap.docs.some((doc) => {
    const student = doc.data() as OfficeStudent;
    return student.archived !== true &&
      (student.status == null || student.status === 'active') &&
      (student.transportMode == null || student.transportMode === 'bus') &&
      typeof student.busRouteId === 'string' && student.busRouteId.length > 0;
  });
}

async function audit(db: AuthContext['db'], schoolId: string, entry: Record<string, unknown>): Promise<void> {
  await db.collection('schools').doc(schoolId).collection('officeAuditLog').add({ ...entry, changedAt: Date.now() });
}

async function createAccess(auth: AuthContext, schoolId: string, body: Body) {
  const familyId = idFrom(body.familyId, 'Family');
  const family = await readFamily(auth.db, schoolId, familyId);
  if (!(await hasBusRider(auth.db, schoolId, familyId))) {
    throw new Error('Only families with an assigned bus rider can receive bus access.');
  }
  const days = daysFrom(body.days);
  const label = body.label == null || body.label === '' ? `${family.displayName} bus access` : textFrom(body.label, 'Access label');
  const id = `pta_${randomBytes(12).toString('base64url')}`;
  const code = randomBytes(18).toString('base64url');
  const now = Date.now();
  const access: OfficeTransportParentAccess & { codeHash: string; codeHint: string } = {
    id,
    familyId,
    label,
    status: 'active',
    createdAt: now,
    createdBy: auth.uid,
    expiresAt: now + days * 24 * 60 * 60 * 1000,
    lastUsedAt: null,
    revokedAt: null,
    updatedAt: now,
    updatedBy: auth.uid,
    consentVersion: 1,
    arrivalPreferences: { email: false, sms: false, whatsapp: false, updatedAt: now },
    codeHash: codeHash(code),
    codeHint: code.slice(-4),
  };
  await auth.db.collection('schools').doc(schoolId).collection('officeTransportParentAccess').doc(id).set(access);
  await audit(auth.db, schoolId, {
    entityType: 'officeTransportParentAccess',
    entityId: id,
    action: 'create',
    summary: `Created private bus access for ${family.displayName}`,
    changedBy: auth.uid,
  });
  return { access: transportParentAccessSafeSummary(access, family.displayName), code, expiresAt: access.expiresAt };
}

async function revokeAccess(auth: AuthContext, schoolId: string, body: Body) {
  const id = idFrom(body.accessId, 'Bus access');
  const ref = auth.db.collection('schools').doc(schoolId).collection('officeTransportParentAccess').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('That bus access was not found.');
  const current = { id: snap.id, ...snap.data() } as OfficeTransportParentAccess;
  if (current.status === 'revoked') return { access: transportParentAccessSafeSummary(current) };
  const now = Date.now();
  await ref.update({ status: 'revoked', revokedAt: now, updatedAt: now, updatedBy: auth.uid });
  await audit(auth.db, schoolId, {
    entityType: 'officeTransportParentAccess',
    entityId: id,
    action: 'update',
    summary: `Revoked private bus access: ${current.label}`,
    changedBy: auth.uid,
  });
  return { access: transportParentAccessSafeSummary({ ...current, status: 'revoked', revokedAt: now, updatedAt: now, updatedBy: auth.uid }) };
}

export async function GET(req: NextRequest) {
  try {
    if (!rateLimit(`office-transport-parent-access:${clientIp(req)}`, 60)) return jsonError(429, 'Too many requests.');
    const body = { schoolId: req.nextUrl.searchParams.get('schoolId') ?? '' };
    const auth = await authenticate(req, body);
    const schoolId = schoolIdFrom(body.schoolId);
    const snap = await auth.db.collection('schools').doc(schoolId).collection('officeTransportParentAccess').orderBy('createdAt', 'desc').limit(200).get();
    const familyIds = [...new Set(snap.docs.map((doc) => String(doc.data().familyId || '')).filter(Boolean))];
    const families = new Map<string, OfficeFamily>();
    await Promise.all(familyIds.map(async (familyId) => {
      const family = await readFamily(auth.db, schoolId, familyId).catch(() => null);
      if (family) families.set(familyId, family);
    }));
    return NextResponse.json({
      accesses: snap.docs.map((doc) => {
        const access = { id: doc.id, ...doc.data() } as OfficeTransportParentAccess;
        return transportParentAccessSafeSummary(access, families.get(access.familyId)?.displayName);
      }),
    }, { headers: noStore() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load bus access.';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400;
    return jsonError(status, message);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`office-transport-parent-access:${clientIp(req)}`, 30)) return jsonError(429, 'Too many requests.');
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await authenticate(req, body);
    const schoolId = schoolIdFrom(body.schoolId);
    if (body.action === 'create') return NextResponse.json(await createAccess(auth, schoolId, body), { headers: noStore() });
    if (body.action === 'revoke') return NextResponse.json(await revokeAccess(auth, schoolId, body), { headers: noStore() });
    return jsonError(400, 'Bus access action is invalid.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update bus access.';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400;
    return jsonError(status, message);
  }
}
