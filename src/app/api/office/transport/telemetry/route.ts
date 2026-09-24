import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { queueOfficeArrivalNotifications, type ArrivalNotificationStatus } from '@/lib/server/officeArrivalNotifications';
import { officeArrivalEventId } from '@/lib/server/officeArrivalEvent';
import { distanceMeters, nextStop, routeForTrip, STOP_ARRIVAL_RADIUS_M } from '@/lib/office/officeTransport';
import type { OfficeBusGpsDevice, OfficeBusLocation, OfficeBusRoute, OfficeBusStop, OfficeBusTrip } from '@/lib/office/types';

export const dynamic = 'force-dynamic';

const SCHOOL_ID_RE = /^[a-z0-9_-]{1,80}$/;
const DEVICE_ID_RE = /^gpd_[A-Za-z0-9_-]{8,80}$/;
const SAMPLE_ID_RE = /^[A-Za-z0-9_-]{8,120}$/;
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,120}$/;
const MAX_LOCATION_AGE_MS = 10 * 60_000;
const LOCATION_RETENTION_MS = 7 * 24 * 60 * 60_000;
const MIN_SAMPLE_INTERVAL_MS = 2_000;

type Body = Record<string, unknown>;
type AuthDevice = { id: string; keyVersion: number; device: OfficeBusGpsDevice };

function stringValue(value: unknown, label: string, max = 160): string {
  if (typeof value !== 'string') throw new Error(`${label} is required.`);
  const clean = value.trim();
  if (!clean || clean.length > max) throw new Error(`${label} is invalid.`);
  return clean;
}

function numberValue(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label} is invalid.`);
  return value;
}

function hashKey(value: string): Buffer {
  return Buffer.from(createHash('sha256').update(value).digest('hex'), 'hex');
}

function keysMatch(expectedHex: string, actual: string): boolean {
  const expected = Buffer.from(expectedHex, 'hex');
  const actualHash = hashKey(actual);
  return expected.length === actualHash.length && timingSafeEqual(expected, actualHash);
}

function schoolIdFrom(body: Body): string {
  const value = stringValue(body.schoolId, 'School', 80).toLowerCase();
  if (!SCHOOL_ID_RE.test(value)) throw new Error('School is invalid.');
  return value;
}

function deviceIdFrom(value: unknown): string {
  const id = stringValue(value, 'GPS device', 100);
  if (!DEVICE_ID_RE.test(id)) throw new Error('GPS device is invalid.');
  return id;
}

async function authenticateTracker(req: NextRequest, body: Body, db: Firestore): Promise<AuthDevice> {
  const schoolId = schoolIdFrom(body);
  const id = deviceIdFrom(req.headers.get('x-gps-device-id') ?? body.deviceId);
  const key = stringValue(req.headers.get('x-gps-device-key') ?? body.deviceKey, 'GPS device key', 300);
  const keyVersionHeader = req.headers.get('x-gps-key-version');
  const deviceRef = db.collection('schools').doc(schoolId).collection('officeBusGpsDevices').doc(id);
  const keyRef = db.collection('schools').doc(schoolId).collection('officeBusGpsDeviceKeys').doc(id);
  const [deviceSnap, keySnap] = await Promise.all([deviceRef.get(), keyRef.get()]);
  if (!deviceSnap.exists || !keySnap.exists) throw new Error('Unauthorized');
  const device = { id, ...deviceSnap.data() } as OfficeBusGpsDevice;
  const stored = keySnap.data() as { keyHash?: string; keyVersion?: number };
  if (device.status !== 'active' || typeof stored.keyHash !== 'string' || !keysMatch(stored.keyHash, key)) throw new Error('Unauthorized');
  if (keyVersionHeader && Number(keyVersionHeader) !== stored.keyVersion) throw new Error('Unauthorized');
  return { id, keyVersion: Number(stored.keyVersion), device };
}

function parseSample(body: Body) {
  const recordedAt = numberValue(body.recordedAt, 'Location time', Date.now() - MAX_LOCATION_AGE_MS, Date.now() + 2 * 60_000);
  const sequence = numberValue(body.sequence, 'Location sequence', 0, Number.MAX_SAFE_INTEGER);
  if (!Number.isInteger(sequence)) throw new Error('Location sequence is invalid.');
  const sampleId = stringValue(body.sampleId, 'Location sample', 120);
  if (!SAMPLE_ID_RE.test(sampleId)) throw new Error('Location sample is invalid.');
  const sessionId = stringValue(body.sessionId, 'Tracker session', 120);
  if (!SESSION_ID_RE.test(sessionId)) throw new Error('Tracker session is invalid.');
  return {
    recordedAt,
    sequence,
    sampleId,
    sessionId,
    lat: numberValue(body.lat, 'Bus latitude', -90, 90),
    lng: numberValue(body.lng, 'Bus longitude', -180, 180),
    accuracyM: body.accuracyM == null ? null : numberValue(body.accuracyM, 'Location accuracy', 0, 100_000),
    speedMps: body.speedMps == null ? null : numberValue(body.speedMps, 'Bus speed', 0, 200),
    headingDeg: body.headingDeg == null ? null : numberValue(body.headingDeg, 'Bus heading', 0, 360),
  };
}

function errorStatus(message: string): number {
  if (message === 'Unauthorized') return 401;
  if (message.includes('not assigned') || message.includes('not belong')) return 409;
  return 400;
}

async function cleanupExpiredTrackerLocations(db: Firestore, schoolId: string): Promise<void> {
  try {
    const expired = await db.collection('schools').doc(schoolId).collection('officeBusGpsLocations').where('expiresAt', '<=', Date.now()).limit(100).get();
    if (expired.empty) return;
    const batch = db.batch();
    for (const doc of expired.docs) batch.delete(doc.ref);
    await batch.commit();
  } catch {
    // A cleanup failure must not reject a fresh tracker reading.
  }
}

function routeForTelemetry(trip: OfficeBusTrip): OfficeBusRoute | null {
  const snapshot = trip.routeSnapshot;
  if (!snapshot) return null;
  return {
    id: trip.routeId,
    name: snapshot.name,
    busNumber: snapshot.busNumber ?? null,
    color: snapshot.color,
    driverName: snapshot.driverName ?? null,
    driverPhone: snapshot.driverPhone ?? null,
    capacity: snapshot.capacity ?? null,
    vehicle: snapshot.vehicle ?? null,
    stops: snapshot.stops ?? [],
    notifyFamiliesOnAlert: snapshot.notifyFamiliesOnAlert === true,
    notifyFamiliesOnArrival: snapshot.notifyFamiliesOnArrival === true,
    requireReleaseConfirmations: snapshot.requireReleaseConfirmations === true,
    notes: null,
    updatedAt: trip.updatedAt,
  };
}

function arrivalEventId(schoolId: string, tripId: string, stopId: string): string {
  return officeArrivalEventId(schoolId, tripId, stopId);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    await getFirebaseAdminAuth();
    const db = getFirestore();
    const auth = await authenticateTracker(req, body, db);
    const schoolId = schoolIdFrom(body);
    const tripId = stringValue(body.tripId, 'Trip', 120);
    if (!/^[A-Za-z0-9_-]+$/.test(tripId)) throw new Error('Trip is invalid.');
    const sample = parseSample(body);
    const schoolRef = db.collection('schools').doc(schoolId);
    await cleanupExpiredTrackerLocations(db, schoolId);
    const tripRef = schoolRef.collection('officeBusTrips').doc(tripId);
    const locationRef = schoolRef.collection('officeBusGpsLocations').doc(auth.id);
    const deviceRef = schoolRef.collection('officeBusGpsDevices').doc(auth.id);
    const keyRef = schoolRef.collection('officeBusGpsDeviceKeys').doc(auth.id);
    const receivedAt = Date.now();
    let duplicate = false;
    let ignored = false;
    let arrivedStopId: string | null = null;
    const arrivalContext: { eventId: string | null; trip: OfficeBusTrip | null; stop: OfficeBusStop | null } = { eventId: null, trip: null, stop: null };
    await db.runTransaction(async (transaction) => {
      const [tripSnap, locationSnap, deviceSnap, keySnap] = await Promise.all([transaction.get(tripRef), transaction.get(locationRef), transaction.get(deviceRef), transaction.get(keyRef)]);
      const currentDevice = deviceSnap.exists ? ({ id: deviceSnap.id, ...deviceSnap.data() } as OfficeBusGpsDevice) : null;
      const currentKey = keySnap.exists ? keySnap.data() as { keyVersion?: number } : null;
      if (!currentDevice || currentDevice.status !== 'active' || currentDevice.assignmentVersion !== auth.device.assignmentVersion || currentKey?.keyVersion !== auth.keyVersion) throw new Error('Unauthorized');
      const trip = tripSnap.exists ? ({ id: tripSnap.id, ...tripSnap.data() } as OfficeBusTrip) : null;
      if (!trip || trip.status !== 'active') throw new Error('This bus run is not active.');
      if (auth.device.assignedRouteId !== trip.routeId || trip.gpsDeviceId !== auth.id || trip.gpsAssignmentVersion !== auth.device.assignmentVersion) throw new Error('This GPS device is not assigned to this bus run.');
      const previous = locationSnap.exists ? locationSnap.data() as { lastSequence?: number; lastRecordedAt?: number; lastSampleId?: string; lastSessionId?: string; lastReceivedAt?: number; nearStopId?: string | null; nearStopFirstAt?: number | null; nearStopSampleCount?: number | null } : null;
      const sameSession = previous?.lastSessionId === sample.sessionId;
      if (previous?.lastSampleId === sample.sampleId || (sameSession && typeof previous?.lastSequence === 'number' && sample.sequence <= previous.lastSequence)) {
        duplicate = true;
        return;
      }
      if (typeof previous?.lastRecordedAt === 'number' && sample.recordedAt < previous.lastRecordedAt) {
        ignored = true;
        return;
      }
      if (typeof previous?.lastReceivedAt === 'number' && receivedAt - previous.lastReceivedAt < MIN_SAMPLE_INTERVAL_MS) throw new Error('Location updates are arriving too quickly.');
      const location: OfficeBusLocation = {
        lat: sample.lat,
        lng: sample.lng,
        accuracy: sample.accuracyM,
        speed: sample.speedMps,
        heading: sample.headingDeg,
        at: receivedAt,
        source: 'gps_device',
      };
      const route = routeForTelemetry(trip);
      const next = route ? nextStop(route, trip) : null;
      const distanceM = next ? distanceMeters({ lat: sample.lat, lng: sample.lng }, next) : null;
      const goodAccuracy = sample.accuracyM != null && sample.accuracyM <= 100;
      const eligibleStop = Boolean(next && !(trip.run === 'pm' && next.isSchool));
      const nearStop = Boolean(eligibleStop && next && goodAccuracy && distanceM != null && distanceM <= STOP_ARRIVAL_RADIUS_M);
      const sameNearStop = Boolean(nearStop && next && previous?.nearStopId === next.id && typeof previous?.nearStopFirstAt === 'number' && receivedAt - previous.nearStopFirstAt <= 20_000);
      const nearStopId = nearStop && next ? next.id : null;
      const nearStopFirstAt = nearStop ? (sameNearStop ? previous?.nearStopFirstAt ?? receivedAt : receivedAt) : null;
      const nearStopSampleCount = nearStop ? (sameNearStop ? (previous?.nearStopSampleCount ?? 0) + 1 : 1) : 0;
      const shouldArrive = Boolean(nearStop && next && nearStopSampleCount >= 2 && !trip.stopArrivals?.[next.id]);
      if (shouldArrive && next) arrivedStopId = next.id;
      transaction.set(locationRef, {
        deviceId: auth.id,
        tripId,
        sampleId: sample.sampleId,
        sequence: sample.sequence,
        recordedAt: sample.recordedAt,
        receivedAt,
        location,
        expiresAt: receivedAt + LOCATION_RETENTION_MS,
        lastSequence: sample.sequence,
        lastRecordedAt: sample.recordedAt,
        lastSampleId: sample.sampleId,
        lastSessionId: sample.sessionId,
        lastReceivedAt: receivedAt,
        nearStopId,
        nearStopFirstAt,
        nearStopSampleCount,
      });
      transaction.update(deviceRef, { lastSeenAt: receivedAt, lastSequence: sample.sequence, updatedAt: receivedAt, updatedBy: 'gps_device' });
      const tripPatch: Record<string, unknown> = { location, locationSource: 'gps_device', updatedAt: receivedAt };
      if (shouldArrive && next) {
        arrivalContext.eventId = arrivalEventId(schoolId, tripId, next.id);
        arrivalContext.trip = trip;
        arrivalContext.stop = next;
        tripPatch[`stopArrivals.${next.id}`] = receivedAt;
        tripPatch[`stopArrivalDetails.${next.id}`] = { at: receivedAt, source: 'gps_device', deviceId: auth.id, sampleId: sample.sampleId, accuracyM: sample.accuracyM, distanceM };
        tripPatch.events = FieldValue.arrayUnion({ kind: 'stop', stopId: next.id, reached: true, at: receivedAt, by: 'gps_device', source: 'gps_device', deviceId: auth.id, sampleId: sample.sampleId, accuracyM: sample.accuracyM, distanceM });
        transaction.set(schoolRef.collection('officeBusArrivalEvents').doc(arrivalContext.eventId), {
          id: arrivalContext.eventId,
          tripId,
          routeId: trip.routeId,
          stopId: next.id,
          stopName: next.name,
          arrivedAt: receivedAt,
          source: 'gps_device',
          deviceId: auth.id,
          sampleId: sample.sampleId,
          accuracyM: sample.accuracyM,
          distanceM,
          notificationStatus: 'pending',
          createdAt: receivedAt,
        });
      }
      transaction.update(tripRef, tripPatch);
    });
    let notificationsQueued = 0;
    let notificationStatus: ArrivalNotificationStatus = 'not_configured';
    if (arrivalContext.eventId && arrivalContext.trip && arrivalContext.stop) {
      try {
        const currentRouteSnap = await schoolRef.collection('officeBusRoutes').doc(arrivalContext.trip.routeId).get();
        const currentRoute = currentRouteSnap.exists ? ({ id: currentRouteSnap.id, ...currentRouteSnap.data() } as OfficeBusRoute) : undefined;
        const route = routeForTrip(currentRoute, arrivalContext.trip) ?? routeForTelemetry(arrivalContext.trip);
        if (route) {
          const stop = route.stops.find((candidate) => candidate.id === arrivalContext.stop?.id) ?? arrivalContext.stop;
          const result = await queueOfficeArrivalNotifications({
            db,
            schoolId,
            eventId: arrivalContext.eventId,
            tripId,
            route,
            stop,
            receivedAt,
            riderManifest: arrivalContext.trip.riderManifest ?? [],
          });
          notificationsQueued = result.queued;
          notificationStatus = result.status;
          await schoolRef.collection('officeBusArrivalEvents').doc(arrivalContext.eventId).update({ notificationStatus, notificationsQueued, notificationUpdatedAt: Date.now() });
        }
      } catch {
        notificationStatus = 'failed';
        if (arrivalContext.eventId) {
          await schoolRef.collection('officeBusArrivalEvents').doc(arrivalContext.eventId).update({ notificationStatus: 'failed', notificationUpdatedAt: Date.now() }).catch(() => undefined);
        }
      }
    }
    return NextResponse.json({ ok: true, duplicate, ignored, arrivedStopId, arrivalEventId: arrivalContext.eventId, notificationsQueued, notificationStatus, receivedAt }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not accept the GPS update.';
    return NextResponse.json({ error: message }, { status: errorStatus(message), headers: { 'Cache-Control': 'no-store' } });
  }
}
