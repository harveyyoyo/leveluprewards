import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '@/lib/server/firebaseAdminAuth';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';
import { checkDeveloperAllowlist, checkSchoolRole, sameOriginCheck, verifyIdToken } from '@/lib/server/kioskSnapshotAuth';
import { familyUpdateMessage, riderManifestFromStudents, riderSnapshotFromStudents, routeForTrip, routeLabel, tripDocId } from '@/lib/office/officeTransport';
import type {
  OfficeBusEvent,
  OfficeBusLocation,
  OfficeBusRelease,
  OfficeBusReleaseMethod,
  OfficeBusRoute,
  OfficeBusRun,
  OfficeBusStop,
  OfficeBusTrip,
  OfficeBusTripAlert,
  OfficeBusVehicleDetails,
  OfficeFamily,
  OfficeStudent,
} from '@/lib/office/types';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64 * 1024;
const MAX_STOPS = 100;
const MAX_RIDERS = 300;
const ALERT_KINDS = new Set<OfficeBusTripAlert['kind']>(['delay', 'breakdown', 'accident', 'behavior', 'other']);
const RELEASE_METHODS = new Set<OfficeBusReleaseMethod>(['authorized_contact', 'id_checked', 'office_override']);
const locationAttempts = new Map<string, { startedAt: number; count: number }>();

type AuthContext = {
  uid: string;
  isAdmin: boolean;
  isDeveloper: boolean;
  db: Firestore;
};

type Body = Record<string, unknown>;

function schoolIdFrom(body: Body): string {
  const value = typeof body.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
  if (!/^[a-z0-9_-]{1,80}$/.test(value)) throw new Error('A valid school is required.');
  return value;
}

function stringValue(value: unknown, label: string, max = 160): string {
  if (typeof value !== 'string') throw new Error(`${label} is required.`);
  const clean = value.trim();
  if (!clean || clean.length > max) throw new Error(`${label} is invalid.`);
  return clean;
}

function optionalString(value: unknown, label: string, max = 500): string | null {
  if (value == null || value === '') return null;
  return stringValue(value, label, max);
}

function safeId(value: unknown, label: string): string {
  const clean = stringValue(value, label, 120);
  if (!/^[A-Za-z0-9_-]+$/.test(clean)) throw new Error(`${label} is invalid.`);
  return clean;
}

function numberInRange(value: unknown, label: string, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label} is outside the allowed range.`);
  return n;
}

function assertRun(value: unknown): OfficeBusRun {
  if (value !== 'am' && value !== 'pm') throw new Error('Choose morning or afternoon.');
  return value;
}

function assertStop(stop: OfficeBusStop): void {
  safeId(stop.id, 'Stop');
  stringValue(stop.name, 'Stop name', 120);
  numberInRange(stop.lat, 'Stop latitude', -90, 90);
  numberInRange(stop.lng, 'Stop longitude', -180, 180);
  for (const time of [stop.amTime, stop.pmTime]) {
    if (time != null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Stop time is invalid.');
  }
}

function assertVehicle(vehicle: OfficeBusRoute['vehicle']): void {
  if (vehicle == null) return;
  if (typeof vehicle !== 'object' || Array.isArray(vehicle)) throw new Error('Vehicle information is invalid.');
  const raw = vehicle as Record<string, unknown>;
  optionalString(raw.make, 'Vehicle make', 80);
  optionalString(raw.model, 'Vehicle model', 80);
  optionalString(raw.plate, 'Vehicle plate', 20);
  optionalString(raw.vin, 'Vehicle VIN', 32);
  optionalString(raw.notes, 'Vehicle notes', 500);
  if (raw.year != null && (!Number.isInteger(raw.year) || (raw.year as number) < 1900 || (raw.year as number) > 2100)) {
    throw new Error('Vehicle year is invalid.');
  }
  for (const [key, label] of [['inspectionDue', 'Inspection date'], ['insuranceDue', 'Insurance date']] as const) {
    const value = raw[key];
    if (value != null && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))) throw new Error(`${label} is invalid.`);
  }
  if (raw.maintenanceLog != null) {
    if (!Array.isArray(raw.maintenanceLog) || raw.maintenanceLog.length > 50) throw new Error('A bus can have up to 50 service records.');
    const ids = new Set<string>();
    for (const value of raw.maintenanceLog) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('A service record is invalid.');
      const entry = value as Record<string, unknown>;
      safeId(entry.id, 'Service record');
      if (ids.has(entry.id as string)) throw new Error('A bus cannot contain the same service record twice.');
      ids.add(entry.id as string);
      if (typeof entry.serviceDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.serviceDate)) throw new Error('Service date is invalid.');
      if (typeof entry.serviceType !== 'string' || !entry.serviceType.trim() || entry.serviceType.trim().length > 100) throw new Error('Give each service record a type under 100 characters.');
      if (entry.mileage != null && (!Number.isInteger(entry.mileage) || (entry.mileage as number) < 0 || (entry.mileage as number) > 10_000_000)) throw new Error('Mileage is invalid.');
      if (entry.archived != null && typeof entry.archived !== 'boolean') throw new Error('Service record choice is invalid.');
      for (const [key, label, max] of [['vendor', 'Service provider', 120], ['notes', 'Service notes', 500]] as const) {
        const field = entry[key];
        if (field != null && (typeof field !== 'string' || field.trim().length > max)) throw new Error(`${label} is invalid.`);
      }
    }
  }
}

function assertRoute(route: OfficeBusRoute): void {
  stringValue(route.name, 'Route name', 100);
  if (!/^#[0-9a-f]{6}$/i.test(route.color)) throw new Error('Route color is invalid.');
  if (route.capacity != null && (!Number.isInteger(route.capacity) || route.capacity < 1 || route.capacity > 200)) {
    throw new Error('Bus capacity is invalid.');
  }
  if (route.notifyFamiliesOnAlert != null && typeof route.notifyFamiliesOnAlert !== 'boolean') throw new Error('Family notification choice is invalid.');
  assertVehicle(route.vehicle);
  if (!Array.isArray(route.stops) || route.stops.length > MAX_STOPS) throw new Error('This route has too many stops.');
  const ids = new Set<string>();
  let schoolStops = 0;
  for (const stop of route.stops) {
    assertStop(stop);
    if (ids.has(stop.id)) throw new Error('This route contains the same stop twice.');
    ids.add(stop.id);
    if (stop.isSchool) schoolStops += 1;
  }
  if (schoolStops > 1 || !route.stops.some((stop) => !stop.isSchool) || schoolStops !== 1) {
    throw new Error('A route needs one school stop and at least one student stop.');
  }
}

async function authenticate(req: NextRequest, body: Body): Promise<AuthContext> {
  if (!sameOriginCheck(req)) throw new AuthError('Forbidden', 403);
  const authHeader = req.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const verified = idToken ? await verifyIdToken(idToken) : null;
  if (!idToken || !verified) throw new AuthError('Unauthorized', 401);
  const schoolId = schoolIdFrom(body);
  const [isDeveloper, hasSchoolRole] = await Promise.all([
    checkDeveloperAllowlist(idToken, verified.uid),
    checkSchoolRole(idToken, verified.uid, schoolId),
  ]);
  if (!isDeveloper && !hasSchoolRole) throw new AuthError('Forbidden', 403);

  let db: Firestore;
  try {
    const app = await getFirebaseAdminApp();
    db = getFirestore(app);
  } catch {
    throw new AuthError('The office service is not configured yet.', 503);
  }

  const schoolRef = db.collection('schools').doc(schoolId);
  const [officeRole, adminRole] = await Promise.all([
    schoolRef.collection('roles_office').doc(verified.uid).get(),
    schoolRef.collection('roles_admin').doc(verified.uid).get(),
  ]);
  const isAdmin = adminRole.exists && adminRole.data()?.role === 'admin';
  if (!isDeveloper && !isAdmin && !(officeRole.exists && officeRole.data()?.role === 'office')) {
    throw new AuthError('Only School Office staff can change transportation records.', 403);
  }
  return { uid: verified.uid, isAdmin, isDeveloper, db };
}

class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function tripRef(db: Firestore, schoolId: string, tripId: string) {
  return db.collection('schools').doc(schoolId).collection('officeBusTrips').doc(tripId);
}

function routeRef(db: Firestore, schoolId: string, routeId: string) {
  return db.collection('schools').doc(schoolId).collection('officeBusRoutes').doc(routeId);
}

async function audit(db: Firestore, schoolId: string, entry: Record<string, unknown>): Promise<void> {
  await db.collection('schools').doc(schoolId).collection('officeAuditLog').add({
    ...entry,
    changedAt: Date.now(),
  });
}

async function activeTripForRoute(db: Firestore, schoolId: string, routeId: string): Promise<OfficeBusTrip | null> {
  const snap = await db.collection('schools').doc(schoolId).collection('officeBusTrips').where('routeId', '==', routeId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as OfficeBusTrip).find((trip) => trip.status === 'active') ?? null;
}

async function getTrip(db: Firestore, schoolId: string, tripId: string): Promise<OfficeBusTrip> {
  const snap = await tripRef(db, schoolId, tripId).get();
  if (!snap.exists) throw new Error('That bus run was not found.');
  return { id: snap.id, ...snap.data() } as OfficeBusTrip;
}

function assertCanOperate(auth: AuthContext, trip: OfficeBusTrip): void {
  const driverId = typeof trip.driverId === 'string' ? trip.driverId : null;
  if (driverId && driverId !== auth.uid && !auth.isAdmin && !auth.isDeveloper) {
    throw new AuthError('This run belongs to another driver.', 403);
  }
}

function assertActive(trip: OfficeBusTrip): void {
  if (trip.status !== 'active') throw new AuthError('This bus run has already ended.', 409);
}

async function resetDemoTransport(auth: AuthContext, schoolId: string): Promise<{ ok: true }> {
  if (!isPublicSampleSchoolId(schoolId) || (!auth.isAdmin && !auth.isDeveloper)) {
    throw new AuthError('Only a demo-school administrator can clear transportation data.', 403);
  }
  const trips = auth.db.collection('schools').doc(schoolId).collection('officeBusTrips');
  const active = await trips.where('status', '==', 'active').limit(1).get();
  if (!active.empty) {
    throw new AuthError('Finish the active bus run before clearing demo transportation data.', 409);
  }
  const routes = auth.db.collection('schools').doc(schoolId).collection('officeBusRoutes');
  const snapshot = await routes.get();
  for (let start = 0; start < snapshot.docs.length; start += 400) {
    const batch = auth.db.batch();
    snapshot.docs.slice(start, start + 400).forEach((doc) => {
      batch.update(doc.ref, { archived: true, updatedAt: Date.now(), updatedBy: auth.uid });
    });
    await batch.commit();
  }
  const activeAfter = await trips.where('status', '==', 'active').limit(1).get();
  if (!activeAfter.empty) {
    for (let start = 0; start < snapshot.docs.length; start += 400) {
      const restore = auth.db.batch();
      snapshot.docs.slice(start, start + 400).forEach((doc) => {
        const original = doc.data() as OfficeBusRoute;
        restore.update(doc.ref, {
          archived: original.archived ?? FieldValue.delete(),
          archivedAt: original.archivedAt ?? FieldValue.delete(),
          updatedAt: original.updatedAt,
          updatedBy: original.updatedBy ?? FieldValue.delete(),
        });
      });
      await restore.commit();
    }
    throw new AuthError('A bus run started while the demo was being reset. Nothing was cleared; try again after it ends.', 409);
  }
  await audit(auth.db, schoolId, {
    entityType: 'officeBusRoute',
    entityId: 'demo-transportation',
    action: 'update',
    summary: 'Demo bus routes hidden; trip history kept',
    changedBy: auth.uid,
  });
  return { ok: true };
}

async function startTrip(auth: AuthContext, schoolId: string, body: Body): Promise<{ tripId: string }> {
  const routeId = safeId(body.routeId, 'Route');
  const requestedId = safeId(body.tripId, 'Trip');
  const date = stringValue(body.date, 'Date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date is invalid.');
  const run = assertRun(body.run);
  const routeSnap = await routeRef(auth.db, schoolId, routeId).get();
  if (!routeSnap.exists) throw new Error('That bus route was not found.');
  const route = { id: routeSnap.id, ...routeSnap.data() } as OfficeBusRoute;
  if (route.archived) throw new Error('That bus route has been removed.');
  assertRoute(route);
  const baseId = tripDocId(date, routeId, run);
  if (requestedId !== baseId && !requestedId.startsWith(`${baseId}_retry-`)) {
    throw new AuthError('That trip id does not belong to this bus run.', 409);
  }
  const existingActive = await activeTripForRoute(auth.db, schoolId, routeId);
  if (existingActive && existingActive.id !== baseId && !existingActive.id.startsWith(`${baseId}_retry-`)) {
    throw new AuthError('This bus is already on a run.', 409);
  }

  const ridersSnap = await auth.db.collection('schools').doc(schoolId).collection('officeStudents').where('busRouteId', '==', routeId).get();
  const riderStudents = ridersSnap.docs.map((doc) => ({ ...(doc.data() as OfficeStudent), id: doc.id }));
  const riderManifest = riderManifestFromStudents(riderStudents);
  const riderSnapshot = riderSnapshotFromStudents(riderStudents);
  const now = Date.now();
  let tripId = baseId;
  let resumed = false;
  const db = auth.db;
  await db.runTransaction(async (transaction) => {
    tripId = baseId;
    resumed = false;
    const baseRef = tripRef(db, schoolId, baseId);
    const baseSnap = await transaction.get(baseRef);
    let targetRef = baseRef;
    let targetId = baseId;
    let targetSnap = baseSnap;
    let createTarget = !baseSnap.exists;

    if (baseSnap.exists) {
      const base = baseSnap.data() as OfficeBusTrip;
      if (base.routeId !== routeId || base.date !== date || base.run !== run) {
        throw new AuthError('That trip belongs to a different bus run.', 409);
      }
      if (base.status === 'active') {
        resumed = true;
      } else {
        const activeRetryId = typeof base.activeRetryId === 'string' ? base.activeRetryId : null;
        if (activeRetryId) {
          const retryRef = tripRef(db, schoolId, activeRetryId);
          const retrySnap = await transaction.get(retryRef);
          if (retrySnap.exists && retrySnap.data()?.status === 'active') {
            targetRef = retryRef;
            targetId = activeRetryId;
            targetSnap = retrySnap;
            resumed = true;
          }
        }
        if (!resumed && requestedId !== baseId) {
          const requestedRef = tripRef(db, schoolId, requestedId);
          const requestedSnap = await transaction.get(requestedRef);
          if (requestedSnap.exists && requestedSnap.data()?.status === 'active') {
            targetRef = requestedRef;
            targetId = requestedId;
            targetSnap = requestedSnap;
            resumed = true;
            transaction.update(baseRef, { activeRetryId: requestedId, updatedAt: now });
          }
        }
        if (!resumed) {
          let retryCount = typeof base.retryCount === 'number' && Number.isInteger(base.retryCount) ? base.retryCount : 0;
          let candidateSnap = baseSnap;
          do {
            retryCount += 1;
            targetId = `${baseId}_retry-${retryCount}`;
            targetRef = tripRef(db, schoolId, targetId);
            candidateSnap = await transaction.get(targetRef);
          } while (candidateSnap.exists && candidateSnap.data()?.status === 'done');
          createTarget = !candidateSnap.exists;
          targetSnap = candidateSnap;
          transaction.update(baseRef, { retryCount, activeRetryId: targetId, updatedAt: now });
        }
      }
    }

    if (createTarget) {
      transaction.set(targetRef, {
        routeId,
        routeSnapshot: { name: route.name, busNumber: route.busNumber ?? null, color: route.color, vehicle: route.vehicle ?? null, stops: route.stops },
        riderSnapshot,
        riderManifest,
        date,
        run,
        status: 'active',
        driverId: auth.uid,
        driverName: route.driverName ?? auth.uid,
        startedAt: now,
        endedAt: null,
        location: null,
        stopArrivals: {},
        riders: {},
        alerts: [],
        events: [],
        childCheckDone: null,
        updatedAt: now,
      });
    } else {
      const existing = targetSnap.data() as OfficeBusTrip;
      if (existing.routeId !== routeId || existing.date !== date || existing.run !== run) {
        throw new AuthError('That trip belongs to a different bus run.', 409);
      }
      if (existing.status === 'active' && existing.driverId && existing.driverId !== auth.uid && !auth.isAdmin && !auth.isDeveloper) {
        throw new AuthError('This run belongs to another driver.', 403);
      }
      transaction.update(targetRef, {
        status: 'active',
        endedAt: null,
        updatedAt: now,
        ...(existing.routeSnapshot ? {} : { routeSnapshot: { name: route.name, busNumber: route.busNumber ?? null, color: route.color, vehicle: route.vehicle ?? null, stops: route.stops } }),
        ...(existing.riderSnapshot ? {} : { riderSnapshot }),
        driverId: auth.uid,
      });
      resumed = true;
    }
  });
  await audit(db, schoolId, {
    entityType: 'officeBusTrip',
    entityId: tripId,
    action: resumed ? 'update' : 'create',
    summary: `${route.name} ${resumed ? 'resumed' : 'started'} the ${run} run`,
    changedBy: auth.uid,
  });
  return { tripId };
}

function allowLocationUpdate(uid: string): boolean {
  const now = Date.now();
  const current = locationAttempts.get(uid);
  if (!current || now - current.startedAt >= 60_000) {
    locationAttempts.set(uid, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 120;
}

async function updateLocation(auth: AuthContext, schoolId: string, body: Body): Promise<{ ok: true }> {
  if (!allowLocationUpdate(auth.uid)) throw new AuthError('Too many location updates. Try again in a minute.', 429);
  const tripId = safeId(body.tripId, 'Trip');
  const trip = await getTrip(auth.db, schoolId, tripId);
  assertActive(trip);
  assertCanOperate(auth, trip);
  const raw = body.location;
  if (!raw || typeof raw !== 'object') throw new Error('A bus location is required.');
  const location = raw as Partial<OfficeBusLocation>;
  const lat = numberInRange(location.lat, 'Bus latitude', -90, 90);
  const lng = numberInRange(location.lng, 'Bus longitude', -180, 180);
  const now = Date.now();
  if (body.reachedStopId) {
    const reachedStopId = safeId(body.reachedStopId, 'Stop');
    if (trip.routeSnapshot && !trip.routeSnapshot.stops.some((stop) => stop.id === reachedStopId)) {
      throw new Error('That stop is not part of this run.');
    }
  }
  const patch: Record<string, unknown> = {
    location: {
      lat,
      lng,
      accuracy: location.accuracy == null ? null : numberInRange(location.accuracy, 'Location accuracy', 0, 100000),
      speed: location.speed == null ? null : numberInRange(location.speed, 'Bus speed', 0, 200),
      heading: location.heading == null ? null : numberInRange(location.heading, 'Bus heading', 0, 360),
      at: now,
    },
    updatedAt: now,
  };
  if (body.reachedStopId) {
    const reachedStopId = safeId(body.reachedStopId, 'Stop');
    patch[`stopArrivals.${reachedStopId}`] = now;
    patch.events = FieldValue.arrayUnion({ kind: 'stop', stopId: reachedStopId, reached: true, at: now, by: auth.uid });
  }
  await tripRef(auth.db, schoolId, tripId).update(patch);
  return { ok: true };
}

async function setStop(auth: AuthContext, schoolId: string, body: Body): Promise<{ ok: true }> {
  const tripId = safeId(body.tripId, 'Trip');
  const stopId = safeId(body.stopId, 'Stop');
  const trip = await getTrip(auth.db, schoolId, tripId);
  assertActive(trip);
  assertCanOperate(auth, trip);
  const stops = trip.routeSnapshot?.stops ?? [];
  if (stops.length && !stops.some((stop) => stop.id === stopId)) throw new Error('That stop is not part of this run.');
  const now = Date.now();
  await tripRef(auth.db, schoolId, tripId).update({
    [`stopArrivals.${stopId}`]: body.reached === true ? now : FieldValue.delete(),
    events: FieldValue.arrayUnion({ kind: 'stop', stopId, reached: body.reached === true, at: now, by: auth.uid }),
    updatedAt: now,
  });
  return { ok: true };
}

async function setRiders(auth: AuthContext, schoolId: string, body: Body): Promise<{ ok: true }> {
  const tripId = safeId(body.tripId, 'Trip');
  const trip = await getTrip(auth.db, schoolId, tripId);
  assertActive(trip);
  assertCanOperate(auth, trip);
  if (!trip.riderSnapshot) throw new Error('This saved run has no rider list. Start a new run before marking riders.');
  const allowed = new Set(trip.riderSnapshot);
  const rawChanges = Array.isArray(body.changes) ? body.changes : [];
  if (rawChanges.length > MAX_RIDERS) throw new Error('Too many rider changes at once.');
  if (rawChanges.length === 0) return { ok: true };
  const now = Date.now();
  const patch: Record<string, unknown> = { updatedAt: now };
  const events: OfficeBusEvent[] = [];
  for (const raw of rawChanges) {
    if (!raw || typeof raw !== 'object') throw new Error('A rider change is invalid.');
    const change = raw as { studentId?: unknown; status?: unknown };
    const studentId = safeId(change.studentId, 'Student');
    if (!allowed.has(studentId)) throw new Error('That student was not assigned to this run.');
    const status = change.status;
    if (status !== null && status !== 'on' && status !== 'off' && status !== 'absent') throw new Error('Rider status is invalid.');
    patch[`riders.${studentId}`] = status ? { status, at: now } : FieldValue.delete();
    events.push({ kind: 'rider', studentId, status, at: now, by: auth.uid });
  }
  patch.events = FieldValue.arrayUnion(...events);
  const batch = auth.db.batch();
  batch.update(tripRef(auth.db, schoolId, tripId), patch);
  for (const event of events) {
    if (event.kind !== 'rider') continue;
    batch.set(auth.db.collection('schools').doc(schoolId).collection('officeAuditLog').doc(), {
      entityType: 'officeBusTrip',
      entityId: event.studentId,
      action: 'update',
      summary: event.status ? `Bus rider marked ${event.status}` : 'Bus rider mark cleared',
      after: { tripId, status: event.status, at: event.at },
      changedBy: auth.uid,
      changedAt: now,
    });
  }
  await batch.commit();
  return { ok: true };
}

async function recordRelease(auth: AuthContext, schoolId: string, body: Body): Promise<{ release: OfficeBusRelease }> {
  const tripId = safeId(body.tripId, 'Trip');
  const studentId = safeId(body.studentId, 'Student');
  const trip = await getTrip(auth.db, schoolId, tripId);
  assertActive(trip);
  assertCanOperate(auth, trip);
  if (trip.riders?.[studentId]?.status !== 'off') throw new Error('Mark the rider off before recording who received them.');
  if (trip.riderSnapshot && !trip.riderSnapshot.includes(studentId)) throw new Error('That rider is not part of this run.');

  const method = body.method;
  if (typeof method !== 'string' || !RELEASE_METHODS.has(method as OfficeBusReleaseMethod)) throw new Error('Release confirmation type is invalid.');
  const note = optionalString(body.note, 'Release note', 500);
  const manifestEntry = trip.riderManifest?.find((entry) => entry.studentId === studentId);
  const studentSnap = await auth.db.collection('schools').doc(schoolId).collection('officeStudents').doc(studentId).get();
  const student = studentSnap.exists ? (studentSnap.data() as OfficeStudent) : null;
  const familyId = student?.familyId ?? manifestEntry?.familyId ?? null;
  let contactId: string | null = null;
  let contactName = '';

  if (method === 'office_override') {
    if (!note) throw new Error('Add a note when the office approves someone who is not on the family list.');
    contactName = stringValue(body.recipientName, 'Recipient name', 120);
  } else {
    contactId = safeId(body.contactId, 'Approved contact');
    const familySnap = familyId ? await auth.db.collection('schools').doc(schoolId).collection('officeFamilies').doc(familyId).get() : null;
    const familyData = familySnap?.exists
      ? (familySnap.data() as { contacts?: Array<{ id: string; name: string; pickupAuthorized?: boolean }> })
      : null;
    const contact = familyData?.contacts?.find((item) => item.id === contactId) ?? null;
    if (!contact) throw new Error('Choose an approved family contact.');
    if (contact.pickupAuthorized === false) throw new Error('That contact is not allowed to receive this student.');
    contactName = stringValue(contact.name, 'Approved contact', 120);
  }

  const now = Date.now();
  const release: OfficeBusRelease = {
    studentId,
    contactId,
    contactName,
    method: method as OfficeBusReleaseMethod,
    note,
    occurredAt: now,
    by: auth.uid,
  };
  const event: OfficeBusEvent = {
    kind: 'release',
    studentId,
    contactId,
    contactName,
    method: release.method,
    at: now,
    by: auth.uid,
  };
  const ref = tripRef(auth.db, schoolId, tripId);
  await auth.db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ref);
    const current = fresh.data() as OfficeBusTrip | undefined;
    if (!current || current.status !== 'active') throw new AuthError('This bus run has already ended.', 409);
    if (current.riders?.[studentId]?.status !== 'off') throw new Error('Mark the rider off before recording who received them.');
    transaction.set(ref, {
      [`releases.${studentId}`]: release,
      events: FieldValue.arrayUnion(event),
      updatedAt: now,
    }, { merge: true });
  });
  await audit(auth.db, schoolId, {
    entityType: 'officeBusTrip',
    entityId: tripId,
    action: 'update',
    summary: `Recorded release for ${studentId}`,
    after: { studentId, method: release.method, contactName: release.contactName, at: now },
    changedBy: auth.uid,
  });
  return { release };
}

async function queueFamilyUpdate(auth: AuthContext, schoolId: string, body: Body): Promise<{ queued: number }> {
  const tripId = safeId(body.tripId, 'Trip');
  const trip = await getTrip(auth.db, schoolId, tripId);
  const route = routeForTrip(undefined, trip);
  if (!route) throw new Error('This run has no saved route information.');
  const message = optionalString(body.message, 'Family update', 1000) ?? familyUpdateMessage(route, trip);
  const studentIds = [...new Set([
    ...(trip.riderManifest?.map((entry) => entry.studentId) ?? []),
    ...(trip.riderSnapshot ?? []),
    ...Object.keys(trip.riders ?? {}),
  ])].filter(Boolean);
  const familyIds = new Set<string>();
  for (const entry of trip.riderManifest ?? []) {
    if (entry.familyId?.trim()) familyIds.add(entry.familyId.trim());
  }
  for (let start = 0; start < studentIds.length; start += 400) {
    const refs = studentIds.slice(start, start + 400).map((studentId) => auth.db.collection('schools').doc(schoolId).collection('officeStudents').doc(studentId));
    const snaps = await auth.db.getAll(...refs);
    for (const snap of snaps) {
      const familyId = snap.data()?.familyId;
      if (typeof familyId === 'string' && familyId.trim()) familyIds.add(familyId.trim());
    }
  }
  const recipients = new Set<string>();
  const familyRefs = [...familyIds].map((familyId) => auth.db.collection('schools').doc(schoolId).collection('officeFamilies').doc(familyId));
  for (let start = 0; start < familyRefs.length; start += 400) {
    const snaps = await auth.db.getAll(...familyRefs.slice(start, start + 400));
    for (const snap of snaps) {
      const family = snap.data() as OfficeFamily | undefined;
      for (const contact of family?.contacts ?? []) {
        if (contact.transportNotificationsEnabled === false) continue;
        const email = contact.email?.trim().toLowerCase();
        if (email) recipients.add(email);
      }
    }
  }
  if (recipients.size === 0) return { queued: 0 };
  const schoolSnap = await auth.db.collection('schools').doc(schoolId).get();
  const schoolName = typeof schoolSnap.data()?.name === 'string' && schoolSnap.data()?.name.trim() ? schoolSnap.data()!.name.trim() : 'School';
  const fromEmail = `"${schoolName} Transportation" <alerts@levelup-edu.com>`;
  const subject = `Transportation update: ${routeLabel(route)}`;
  const mail = auth.db.collection('mail');
  const recipientList = [...recipients];
  for (let start = 0; start < recipientList.length; start += 400) {
    const batch = auth.db.batch();
    for (const email of recipientList.slice(start, start + 400)) {
      batch.set(mail.doc(), {
        to: email,
        from: fromEmail,
        message: { subject, text: message },
        schoolId,
        tripId,
        routeId: trip.routeId,
        kind: 'transportation',
        queuedAt: Date.now(),
        queuedBy: auth.uid,
      });
    }
    await batch.commit();
  }
  await audit(auth.db, schoolId, {
    entityType: 'officeBusTrip',
    entityId: tripId,
    action: 'update',
    summary: `Queued a family update for ${recipientList.length} recipient${recipientList.length === 1 ? '' : 's'}`,
    changedBy: auth.uid,
  });
  return { queued: recipientList.length };
}

function alertFamilyMessage(kind: OfficeBusTripAlert['kind'], minutes: number | null, note: string | null, route: OfficeBusRoute): string {
  const label = kind === 'delay' ? 'a delay' : kind === 'breakdown' ? 'a vehicle problem' : kind === 'accident' ? 'an accident' : kind === 'behavior' ? 'a behavior concern' : 'a transportation problem';
  const timing = minutes == null ? '' : ` (${minutes} minutes late)`;
  return [
    `The office received a report about ${label}${timing} on ${routeLabel(route)}.`,
    note ? `Driver note: ${note}` : '',
    'Please contact the school office if you need more information.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function addAlert(auth: AuthContext, schoolId: string, body: Body): Promise<{
  ok: true;
  notificationsQueued: number;
  notificationStatus: 'not_configured' | 'queued' | 'no_recipients' | 'failed';
}> {
  const tripId = safeId(body.tripId, 'Trip');
  const trip = await getTrip(auth.db, schoolId, tripId);
  assertActive(trip);
  assertCanOperate(auth, trip);
  const kind = body.kind;
  if (typeof kind !== 'string' || !ALERT_KINDS.has(kind as OfficeBusTripAlert['kind'])) throw new Error('Problem type is invalid.');
  const message = optionalString(body.message, 'Problem note', 500);
  const minutes = body.minutes == null ? null : numberInRange(body.minutes, 'Delay', 1, 240);
  const now = Date.now();
  const entry = { id: `alert-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`, kind, message, minutes, at: now, by: auth.uid };
  await tripRef(auth.db, schoolId, tripId).update({ alerts: FieldValue.arrayUnion(entry), updatedAt: now });
  await audit(auth.db, schoolId, { entityType: 'officeBusTrip', entityId: tripId, action: 'update', summary: `Driver reported ${kind}`, changedBy: auth.uid });

  let notificationsQueued = 0;
  let notificationStatus: 'not_configured' | 'queued' | 'no_recipients' | 'failed' = 'not_configured';
  const routeSnap = await auth.db.collection('schools').doc(schoolId).collection('officeBusRoutes').doc(trip.routeId).get();
  const currentRoute = routeSnap.exists ? (routeSnap.data() as OfficeBusRoute) : undefined;
  const route = routeForTrip(currentRoute, trip);
  if (route?.notifyFamiliesOnAlert) {
    try {
      notificationsQueued = (
        await queueFamilyUpdate(auth, schoolId, {
          tripId,
          message: alertFamilyMessage(kind as OfficeBusTripAlert['kind'], minutes, message, route),
        })
      ).queued;
      notificationStatus = notificationsQueued > 0 ? 'queued' : 'no_recipients';
    } catch {
      // The safety report is already saved. A mail-service problem must not make the driver retry it.
      notificationStatus = 'failed';
    }
  }
  return { ok: true, notificationsQueued, notificationStatus };
}

async function endTrip(auth: AuthContext, schoolId: string, body: Body): Promise<{ ok: true }> {
  const tripId = safeId(body.tripId, 'Trip');
  const trip = await getTrip(auth.db, schoolId, tripId);
  assertActive(trip);
  assertCanOperate(auth, trip);
  if (body.childCheckDone !== true) throw new Error('Confirm that you walked the bus before ending the run.');
  const riderStates = trip.riders ?? {};
  const unresolved = (trip.riderSnapshot ?? []).filter((studentId) => {
    const status = riderStates[studentId]?.status;
    return status !== 'off' && status !== 'absent';
  });
  if (unresolved.length > 0) throw new Error('Mark every rider off or not here before ending the run.');
  const now = Date.now();
  await tripRef(auth.db, schoolId, tripId).update({ status: 'done', endedAt: now, childCheckDone: true, updatedAt: now });
  await audit(auth.db, schoolId, { entityType: 'officeBusTrip', entityId: tripId, action: 'update', summary: `Finished the ${trip.run} run · bus checked`, changedBy: auth.uid });
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: 'That change is too large.' }, { status: 413 });
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  if (JSON.stringify(body).length > MAX_BODY_BYTES) return NextResponse.json({ error: 'That change is too large.' }, { status: 413 });

  let auth: AuthContext;
  let schoolId: string;
  try {
    schoolId = schoolIdFrom(body);
    auth = await authenticate(req, body);
    switch (body.action) {
      case 'start':
        return NextResponse.json(await startTrip(auth, schoolId, body));
      case 'location':
        return NextResponse.json(await updateLocation(auth, schoolId, body));
      case 'stop':
        return NextResponse.json(await setStop(auth, schoolId, body));
      case 'riders':
        return NextResponse.json(await setRiders(auth, schoolId, body));
      case 'release':
        return NextResponse.json(await recordRelease(auth, schoolId, body));
      case 'queue':
        return NextResponse.json(await queueFamilyUpdate(auth, schoolId, body));
      case 'alert':
        return NextResponse.json(await addAlert(auth, schoolId, body));
      case 'end':
        return NextResponse.json(await endTrip(auth, schoolId, body));
      case 'reset':
        return NextResponse.json(await resetDemoTransport(auth, schoolId));
      default:
        return NextResponse.json({ error: 'Unknown transportation action.' }, { status: 400 });
    }
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'Could not save that change.';
    if (status >= 500) console.error('office transport', error);
    return NextResponse.json({ error: message }, { status });
  }
}
