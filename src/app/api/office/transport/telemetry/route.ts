import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import type { OfficeBusGpsDevice, OfficeBusLocation, OfficeBusTrip } from '@/lib/office/types';

export const dynamic = 'force-dynamic';

const SCHOOL_ID_RE = /^[a-z0-9_-]{1,80}$/;
const DEVICE_ID_RE = /^gpd_[A-Za-z0-9_-]{8,80}$/;
const SAMPLE_ID_RE = /^[A-Za-z0-9_-]{8,120}$/;
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
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`${label} is invalid.`);
  return number;
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
  return {
    recordedAt,
    sequence,
    sampleId,
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
    const tripRef = db.collection('schools').doc(schoolId).collection('officeBusTrips').doc(tripId);
    const locationRef = db.collection('schools').doc(schoolId).collection('officeBusGpsLocations').doc(auth.id);
    const deviceRef = db.collection('schools').doc(schoolId).collection('officeBusGpsDevices').doc(auth.id);
    const keyRef = db.collection('schools').doc(schoolId).collection('officeBusGpsDeviceKeys').doc(auth.id);
    const receivedAt = Date.now();
    let duplicate = false;
    let ignored = false;
    await db.runTransaction(async (transaction) => {
      const [tripSnap, locationSnap, deviceSnap, keySnap] = await Promise.all([transaction.get(tripRef), transaction.get(locationRef), transaction.get(deviceRef), transaction.get(keyRef)]);
      const currentDevice = deviceSnap.exists ? ({ id: deviceSnap.id, ...deviceSnap.data() } as OfficeBusGpsDevice) : null;
      const currentKey = keySnap.exists ? keySnap.data() as { keyVersion?: number } : null;
      if (!currentDevice || currentDevice.status !== 'active' || currentKey?.keyVersion !== auth.keyVersion) throw new Error('Unauthorized');
      const trip = tripSnap.exists ? ({ id: tripSnap.id, ...tripSnap.data() } as OfficeBusTrip) : null;
      if (!trip || trip.status !== 'active') throw new Error('This bus run is not active.');
      if (auth.device.assignedRouteId !== trip.routeId || trip.gpsDeviceId !== auth.id || trip.gpsAssignmentVersion !== auth.device.assignmentVersion) throw new Error('This GPS device is not assigned to this bus run.');
      const previous = locationSnap.exists ? locationSnap.data() as { lastSequence?: number; lastRecordedAt?: number; lastSampleId?: string; lastReceivedAt?: number } : null;
      if (previous?.lastSampleId === sample.sampleId || (typeof previous?.lastSequence === 'number' && sample.sequence <= previous.lastSequence)) {
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
        lastReceivedAt: receivedAt,
      });
      transaction.update(deviceRef, { lastSeenAt: receivedAt, lastSequence: sample.sequence, updatedAt: receivedAt, updatedBy: 'gps_device' });
      transaction.update(tripRef, { location, locationSource: 'gps_device', updatedAt: receivedAt });
    });
    return NextResponse.json({ ok: true, duplicate, ignored, receivedAt }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not accept the GPS update.';
    return NextResponse.json({ error: message }, { status: errorStatus(message), headers: { 'Cache-Control': 'no-store' } });
  }
}
