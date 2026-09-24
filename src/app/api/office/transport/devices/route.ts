import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { checkSchoolRole, sameOriginCheck, verifyIdToken } from '@/lib/server/kioskSnapshotAuth';
import { clientIp, jsonError, rateLimit } from '@/lib/server/apiSecurity';
import type { OfficeBusGpsDevice } from '@/lib/office/types';

export const dynamic = 'force-dynamic';

type AuthContext = { uid: string; db: Firestore };
type Body = Record<string, unknown>;

const SCHOOL_ID_RE = /^[a-z0-9_-]{1,80}$/;
const DEVICE_ID_RE = /^gpd_[A-Za-z0-9_-]{8,80}$/;

function schoolIdFrom(body: Body): string {
  const value = typeof body.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
  if (!SCHOOL_ID_RE.test(value)) throw new Error('A valid school is required.');
  return value;
}

function stringValue(value: unknown, label: string, max = 120): string {
  if (typeof value !== 'string') throw new Error(`${label} is required.`);
  const clean = value.trim();
  if (!clean || clean.length > max) throw new Error(`${label} is invalid.`);
  return clean;
}

function deviceIdFrom(value: unknown): string {
  const id = stringValue(value, 'GPS device', 100);
  if (!DEVICE_ID_RE.test(id)) throw new Error('GPS device is invalid.');
  return id;
}

function routeIdFrom(value: unknown): string {
  const id = stringValue(value, 'Route', 120);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Route is invalid.');
  return id;
}

function devices(db: Firestore, schoolId: string) {
  return db.collection('schools').doc(schoolId).collection('officeBusGpsDevices');
}

function deviceKeys(db: Firestore, schoolId: string) {
  return db.collection('schools').doc(schoolId).collection('officeBusGpsDeviceKeys');
}

function safeDevice(device: OfficeBusGpsDevice) {
  const { id, label, status, assignedRouteId, assignmentVersion, keyVersion, lastSeenAt, lastSequence, createdAt, updatedAt, revokedAt } = device;
  return { id, label, status, assignedRouteId, assignmentVersion, keyVersion, lastSeenAt, lastSequence, createdAt, updatedAt, revokedAt: revokedAt ?? null };
}

function keyHash(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function audit(db: Firestore, schoolId: string, entry: Record<string, unknown>): Promise<void> {
  await db.collection('schools').doc(schoolId).collection('officeAuditLog').add({ ...entry, changedAt: Date.now() });
}

async function authenticate(req: NextRequest, body: Body): Promise<AuthContext> {
  if (!sameOriginCheck(req)) throw new Error('Forbidden');
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const verified = token ? await verifyIdToken(token) : null;
  if (!token || !verified) throw new Error('Unauthorized');
  const schoolId = schoolIdFrom(body);
  if (!(await checkSchoolRole(token, verified.uid, schoolId))) throw new Error('Forbidden');
  await getFirebaseAdminAuth();
  return { uid: verified.uid, db: getFirestore() };
}

async function getDevice(db: Firestore, schoolId: string, id: string): Promise<OfficeBusGpsDevice> {
  const snap = await devices(db, schoolId).doc(id).get();
  if (!snap.exists) throw new Error('GPS device not found.');
  return { id: snap.id, ...snap.data() } as OfficeBusGpsDevice;
}

async function routeExists(db: Firestore, schoolId: string, routeId: string): Promise<void> {
  const snap = await db.collection('schools').doc(schoolId).collection('officeBusRoutes').doc(routeId).get();
  if (!snap.exists || snap.data()?.archived === true) throw new Error('That bus route is not available.');
}

async function enroll(auth: AuthContext, schoolId: string, body: Body) {
  const routeId = routeIdFrom(body.routeId);
  const label = stringValue(body.label, 'GPS device name', 100);
  await routeExists(auth.db, schoolId, routeId);
  const id = `gpd_${randomBytes(12).toString('base64url')}`;
  const deviceKey = `gpk_${randomBytes(32).toString('base64url')}`;
  const now = Date.now();
  const device: OfficeBusGpsDevice = {
    id,
    label,
    status: 'active',
    assignedRouteId: routeId,
    assignmentVersion: 1,
    keyVersion: 1,
    lastSeenAt: null,
    lastSequence: null,
    createdAt: now,
    createdBy: auth.uid,
    updatedAt: now,
    updatedBy: auth.uid,
  };
  const batch = auth.db.batch();
  batch.set(devices(auth.db, schoolId).doc(id), device);
  batch.set(deviceKeys(auth.db, schoolId).doc(id), { deviceId: id, keyHash: keyHash(deviceKey), keyVersion: 1, createdAt: now, updatedAt: now });
  await batch.commit();
  await audit(auth.db, schoolId, { entityType: 'officeBusGpsDevice', entityId: id, action: 'create', summary: `Paired GPS device ${label}`, changedBy: auth.uid });
  return { device: safeDevice(device), deviceKey };
}

async function rotate(auth: AuthContext, schoolId: string, body: Body) {
  const id = deviceIdFrom(body.deviceId);
  const current = await getDevice(auth.db, schoolId, id);
  if (current.status !== 'active') throw new Error('This GPS device is revoked.');
  const deviceKey = `gpk_${randomBytes(32).toString('base64url')}`;
  const keyVersion = current.keyVersion + 1;
  const now = Date.now();
  const batch = auth.db.batch();
  batch.update(devices(auth.db, schoolId).doc(id), { keyVersion, updatedAt: now, updatedBy: auth.uid });
  batch.set(deviceKeys(auth.db, schoolId).doc(id), { deviceId: id, keyHash: keyHash(deviceKey), keyVersion, createdAt: current.createdAt, updatedAt: now });
  await batch.commit();
  await audit(auth.db, schoolId, { entityType: 'officeBusGpsDevice', entityId: id, action: 'update', summary: `Rotated GPS device key for ${current.label}`, changedBy: auth.uid });
  return { device: safeDevice({ ...current, keyVersion, updatedAt: now, updatedBy: auth.uid }), deviceKey };
}

async function revoke(auth: AuthContext, schoolId: string, body: Body) {
  const id = deviceIdFrom(body.deviceId);
  const current = await getDevice(auth.db, schoolId, id);
  if (current.status === 'revoked') return { device: safeDevice(current) };
  const now = Date.now();
  const batch = auth.db.batch();
  batch.update(devices(auth.db, schoolId).doc(id), { status: 'revoked', revokedAt: now, updatedAt: now, updatedBy: auth.uid });
  batch.delete(deviceKeys(auth.db, schoolId).doc(id));
  await batch.commit();
  await audit(auth.db, schoolId, { entityType: 'officeBusGpsDevice', entityId: id, action: 'update', summary: `Revoked GPS device ${current.label}`, changedBy: auth.uid });
  return { device: safeDevice({ ...current, status: 'revoked', revokedAt: now, updatedAt: now, updatedBy: auth.uid }) };
}

async function assign(auth: AuthContext, schoolId: string, body: Body) {
  const id = deviceIdFrom(body.deviceId);
  const current = await getDevice(auth.db, schoolId, id);
  if (current.status !== 'active') throw new Error('This GPS device is revoked.');
  const routeId = body.routeId == null ? null : routeIdFrom(body.routeId);
  if (routeId) await routeExists(auth.db, schoolId, routeId);
  if (routeId === current.assignedRouteId) return { device: safeDevice(current) };
  for (const affectedRouteId of [...new Set([routeId, current.assignedRouteId].filter((value): value is string => !!value))]) {
    const activeTrips = await auth.db.collection('schools').doc(schoolId).collection('officeBusTrips').where('routeId', '==', affectedRouteId).where('status', '==', 'active').limit(1).get();
    if (!activeTrips.empty) throw new Error('Finish the active bus run before changing its GPS device.');
  }
  const now = Date.now();
  const next = { ...current, assignedRouteId: routeId, assignmentVersion: current.assignmentVersion + 1, updatedAt: now, updatedBy: auth.uid };
  await devices(auth.db, schoolId).doc(id).update({ assignedRouteId: routeId, assignmentVersion: next.assignmentVersion, updatedAt: now, updatedBy: auth.uid });
  await audit(auth.db, schoolId, { entityType: 'officeBusGpsDevice', entityId: id, action: 'update', summary: routeId ? `Assigned GPS device ${current.label} to a route` : `Removed GPS device ${current.label} from its route`, changedBy: auth.uid });
  return { device: safeDevice(next) };
}

export async function GET(req: NextRequest) {
  try {
    if (!rateLimit(`office-gps-devices:${clientIp(req)}`, 60)) return jsonError(429, 'Too many requests.');
    const body = { schoolId: req.nextUrl.searchParams.get('schoolId') ?? '' };
    const auth = await authenticate(req, body);
    const schoolId = schoolIdFrom(body);
    const snap = await devices(auth.db, schoolId).orderBy('createdAt', 'desc').limit(200).get();
    return NextResponse.json({ devices: snap.docs.map((doc) => safeDevice({ id: doc.id, ...doc.data() } as OfficeBusGpsDevice)) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load GPS devices.';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400;
    return jsonError(status, message);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`office-gps-devices:${clientIp(req)}`, 30)) return jsonError(429, 'Too many requests.');
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await authenticate(req, body);
    const schoolId = schoolIdFrom(body);
    switch (body.action) {
      case 'enroll':
        return NextResponse.json(await enroll(auth, schoolId, body), { headers: { 'Cache-Control': 'no-store' } });
      case 'rotate':
        return NextResponse.json(await rotate(auth, schoolId, body), { headers: { 'Cache-Control': 'no-store' } });
      case 'revoke':
        return NextResponse.json(await revoke(auth, schoolId, body), { headers: { 'Cache-Control': 'no-store' } });
      case 'assign':
        return NextResponse.json(await assign(auth, schoolId, body), { headers: { 'Cache-Control': 'no-store' } });
      default:
        return jsonError(400, 'GPS device action is invalid.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update GPS devices.';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400;
    return jsonError(status, message);
  }
}
