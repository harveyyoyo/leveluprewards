import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '@/lib/server/firebaseAdminAuth';
import { checkDeveloperAllowlist, checkSchoolRole, sameOriginCheck, verifyIdToken } from '@/lib/server/kioskSnapshotAuth';
import { clientIp, jsonError, rateLimit } from '@/lib/server/apiSecurity';
import { queueOfficeArrivalNotifications, type ArrivalNotificationStatus } from '@/lib/server/officeArrivalNotifications';
import { routeForTrip } from '@/lib/office/officeTransport';
import type { OfficeBusRoute, OfficeBusTrip } from '@/lib/office/types';

export const dynamic = 'force-dynamic';

const SCHOOL_ID_RE = /^[a-z0-9_-]{1,80}$/;
const EVENT_ID_RE = /^[A-Za-z0-9_-]{1,120}$/;

type Body = Record<string, unknown>;
type AuthContext = { uid: string; db: Firestore; isDeveloper: boolean };

class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function schoolIdFrom(value: unknown): string {
  const schoolId = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!SCHOOL_ID_RE.test(schoolId)) throw new AuthError('A valid school is required.', 400);
  return schoolId;
}

function eventIdFrom(value: unknown): string {
  const eventId = typeof value === 'string' ? value.trim() : '';
  if (!EVENT_ID_RE.test(eventId)) throw new AuthError('That arrival message record is invalid.', 400);
  return eventId;
}

async function authenticate(req: NextRequest, body: Body): Promise<AuthContext> {
  if (!sameOriginCheck(req)) throw new AuthError('Forbidden', 403);
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const verified = token ? await verifyIdToken(token) : null;
  if (!token || !verified) throw new AuthError('Unauthorized', 401);
  const schoolId = schoolIdFrom(body.schoolId);
  const [isDeveloper, hasSchoolRole] = await Promise.all([
    checkDeveloperAllowlist(token, verified.uid),
    checkSchoolRole(token, verified.uid, schoolId),
  ]);
  if (!isDeveloper && !hasSchoolRole) throw new AuthError('Forbidden', 403);

  let db: Firestore;
  try {
    db = getFirestore(await getFirebaseAdminApp());
  } catch {
    throw new AuthError('The office service is not configured yet.', 503);
  }
  if (!isDeveloper) {
    const schoolRef = db.collection('schools').doc(schoolId);
    const [office, admin] = await Promise.all([
      schoolRef.collection('roles_office').doc(verified.uid).get(),
      schoolRef.collection('roles_admin').doc(verified.uid).get(),
    ]);
    const allowed = (office.exists && office.data()?.role === 'office') || (admin.exists && admin.data()?.role === 'admin');
    if (!allowed) throw new AuthError('Only School Office staff can view delivery records.', 403);
  }
  return { uid: verified.uid, db, isDeveloper };
}

function safeEvent(value: Record<string, unknown>, id: string) {
  const status = typeof value.notificationStatus === 'string' ? value.notificationStatus : 'pending';
  return {
    id,
    tripId: typeof value.tripId === 'string' ? value.tripId : null,
    routeId: typeof value.routeId === 'string' ? value.routeId : null,
    stopId: typeof value.stopId === 'string' ? value.stopId : null,
    stopName: typeof value.stopName === 'string' ? value.stopName : 'Bus stop',
    arrivedAt: typeof value.arrivedAt === 'number' ? value.arrivedAt : null,
    source: value.source === 'gps_device' || value.source === 'browser' || value.source === 'manual' ? value.source : 'unknown',
    notificationStatus: status,
    notificationsQueued: typeof value.notificationsQueued === 'number' ? value.notificationsQueued : 0,
    notificationsAlreadyQueued: typeof value.notificationsAlreadyQueued === 'number' ? value.notificationsAlreadyQueued : 0,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    if (!rateLimit(`office-transport-delivery:${clientIp(req)}`, 60)) return jsonError(429, 'Too many requests.');
    const schoolId = schoolIdFrom(req.nextUrl.searchParams.get('schoolId'));
    const auth = await authenticate(req, { schoolId });
    const snapshot = await auth.db.collection('schools').doc(schoolId).collection('officeBusArrivalEvents').orderBy('createdAt', 'desc').limit(200).get();
    return NextResponse.json({ events: snapshot.docs.map((doc) => safeEvent(doc.data(), doc.id)), checkedAt: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'Could not load delivery records.';
    return jsonError(status, message);
  }
}

async function retry(auth: AuthContext, schoolId: string, body: Body) {
  const eventId = eventIdFrom(body.eventId);
  const schoolRef = auth.db.collection('schools').doc(schoolId);
  const eventRef = schoolRef.collection('officeBusArrivalEvents').doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new AuthError('That arrival message record was not found.', 404);
  const event = eventSnap.data() as Record<string, unknown>;
  const tripId = typeof event.tripId === 'string' ? event.tripId : '';
  if (!tripId) throw new AuthError('That arrival message record has no bus run.', 409);
  const tripSnap = await schoolRef.collection('officeBusTrips').doc(tripId).get();
  if (!tripSnap.exists) throw new AuthError('The bus run for that message was not found.', 404);
  const trip = { id: tripSnap.id, ...tripSnap.data() } as OfficeBusTrip;
  const routeId = typeof event.routeId === 'string' ? event.routeId : trip.routeId;
  const routeSnap = await schoolRef.collection('officeBusRoutes').doc(routeId).get();
  const currentRoute = routeSnap.exists ? ({ id: routeSnap.id, ...routeSnap.data() } as OfficeBusRoute) : undefined;
  const route = routeForTrip(currentRoute, trip);
  const stopId = typeof event.stopId === 'string' ? event.stopId : '';
  const stop = route?.stops.find((candidate) => candidate.id === stopId);
  if (!route || !stop) throw new AuthError('The saved stop for that message is not available.', 409);
  const receivedAt = typeof event.arrivedAt === 'number' ? event.arrivedAt : Date.now();
  const result = await queueOfficeArrivalNotifications({
    db: auth.db,
    schoolId,
    eventId,
    tripId,
    route,
    stop,
    receivedAt,
    riderManifest: trip.riderManifest ?? [],
  });
  await eventRef.update({
    notificationStatus: result.status,
    notificationsQueued: result.queued,
    notificationsAlreadyQueued: result.alreadyQueued ?? 0,
    notificationUpdatedAt: Date.now(),
  });
  return result;
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`office-transport-delivery-retry:${clientIp(req)}`, 30)) return jsonError(429, 'Too many requests.');
    const body = (await req.json().catch(() => ({}))) as Body;
    const schoolId = schoolIdFrom(body.schoolId);
    const auth = await authenticate(req, body);
    const result = await retry(auth, schoolId, body);
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'Could not retry that message.';
    if (status >= 500) console.error('office transport delivery retry', error);
    return jsonError(status, message);
  }
}

export type DeliveryEvent = ReturnType<typeof safeEvent>;
export type DeliveryRetryResult = ArrivalNotificationStatus;
