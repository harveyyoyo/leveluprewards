import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import { checkSchoolRole, sameOriginCheck, verifyIdToken } from '@/lib/server/kioskSnapshotAuth';
import { clientIp, rateLimit } from '@/lib/server/apiSecurity';
import {
  buildOfficeRouteSuggestions,
  type OfficeRouteFamily,
  type OfficeRoutePoint,
  type OfficeRouteStudent,
} from '@/lib/office/officeRouteSuggestions';

export const dynamic = 'force-dynamic';

const MAX_GEOCODED_FAMILIES = 250;
const GEOCODER_CONCURRENCY = 10;
const GEOCODER_TIMEOUT_MS = 4_000;

type SuggestionRequestBody = {
  schoolId?: unknown;
  geocodeAddresses?: unknown;
  schoolPoint?: unknown;
  maxRoutes?: unknown;
  clusterRadiusMeters?: unknown;
  defaultCapacity?: unknown;
};

type GeocodingSummary = {
  requested: boolean;
  attemptedFamilyCount: number;
  locatedFamilyCount: number;
  unavailableFamilyCount: number;
};

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

function optionalNumber(
  value: unknown,
  field: string,
  options: { min: number; max: number; integer?: boolean },
): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} must be a number.`);
  }
  if (value < options.min || value > options.max) {
    throw new Error(`${field} must be between ${options.min} and ${options.max}.`);
  }
  return options.integer ? Math.floor(value) : value;
}

function routePoint(value: unknown): OfficeRoutePoint | undefined {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== 'object') throw new Error('schoolPoint is invalid.');
  const record = value as Record<string, unknown>;
  const lat = record.lat;
  const lng = record.lng;
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new Error('schoolPoint is invalid.');
  }
  return { lat, lng };
}

async function runWithConcurrency<T>(
  values: readonly T[],
  concurrency: number,
  task: (value: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, values.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      await task(values[index]);
    }
  });
  await Promise.all(workers);
}

async function geocodeWithPhoton(address: string): Promise<OfficeRoutePoint | null> {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', address);
  url.searchParams.set('limit', '1');
  url.searchParams.set('lang', 'en');

  const response = await fetch(url, {
    headers: { 'User-Agent': 'LevelUp School Office route suggestions' },
    signal: AbortSignal.timeout(GEOCODER_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: unknown } }>;
  };
  const coordinates = data.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lng = coordinates[0];
  const lat = coordinates[1];
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { lat, lng };
}

async function geocodeFamilyAddresses(
  families: readonly OfficeRouteFamily[],
  referencedFamilyIds: ReadonlySet<string>,
): Promise<{ points: Map<string, OfficeRoutePoint>; summary: GeocodingSummary }> {
  const addressByFamilyId = new Map<string, string>();
  for (const family of families) {
    if (family.archived === true || !referencedFamilyIds.has(family.id)) continue;
    const address = typeof family.homeAddress === 'string' ? family.homeAddress.trim().slice(0, 500) : '';
    if (address) addressByFamilyId.set(family.id, address);
  }

  const entries = [...addressByFamilyId.entries()].slice(0, MAX_GEOCODED_FAMILIES);
  const points = new Map<string, OfficeRoutePoint>();
  await runWithConcurrency(entries, GEOCODER_CONCURRENCY, async ([familyId, address]) => {
    try {
      const point = await geocodeWithPhoton(address);
      if (point) points.set(familyId, point);
    } catch {
      // A failed lookup leaves that family in the helper's review draft.
    }
  });

  return {
    points,
    summary: {
      requested: true,
      attemptedFamilyCount: entries.length,
      locatedFamilyCount: points.size,
      unavailableFamilyCount: Math.max(0, addressByFamilyId.size - points.size),
    },
  };
}

export async function POST(req: NextRequest) {
  if (!sameOriginCheck(req)) return jsonError('Forbidden', 403);
  if (!rateLimit(`office-route-suggestions:${clientIp(req)}`, 12)) return jsonError('Too many requests. Try again in a minute.', 429);

  const authorization = req.headers.get('authorization') ?? '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!idToken) return jsonError('Unauthorized', 401);

  const verified = await verifyIdToken(idToken);
  if (!verified) return jsonError('Invalid token', 401);

  let body: SuggestionRequestBody;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body');
    body = parsed as SuggestionRequestBody;
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  const schoolId = typeof body.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
  if (!schoolId || schoolId.length > 100) return jsonError('Missing or invalid schoolId', 400);
  if (body.geocodeAddresses !== undefined && typeof body.geocodeAddresses !== 'boolean') {
    return jsonError('geocodeAddresses must be true or false', 400);
  }

  const allowed = await checkSchoolRole(idToken, verified.uid, schoolId);
  if (!allowed) return jsonError('Forbidden', 403);

  let maxRoutes: number | undefined;
  let clusterRadiusMeters: number | undefined;
  let defaultCapacity: number | undefined;
  let schoolPoint: OfficeRoutePoint | undefined;
  try {
    maxRoutes = optionalNumber(body.maxRoutes, 'maxRoutes', { min: 0, max: 10, integer: true });
    clusterRadiusMeters = optionalNumber(body.clusterRadiusMeters, 'clusterRadiusMeters', {
      min: 0,
      max: 50_000,
    });
    defaultCapacity = optionalNumber(body.defaultCapacity, 'defaultCapacity', {
      min: 1,
      max: 200,
      integer: true,
    });
    schoolPoint = routePoint(body.schoolPoint);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid suggestion options', 400);
  }

  try {
    const firestore = await getFirebaseAdminFirestore();
    const school = firestore.collection('schools').doc(schoolId);
    const [familySnapshot, studentSnapshot, routeSnapshot] = await Promise.all([
      school.collection('officeFamilies').get(),
      school.collection('officeStudents').get(),
      school.collection('officeBusRoutes').get(),
    ]);

    const families: OfficeRouteFamily[] = familySnapshot.docs.map((snapshot) => {
      const data = snapshot.data() as { homeAddress?: unknown; archived?: unknown };
      return {
        id: snapshot.id,
        homeAddress: typeof data.homeAddress === 'string' ? data.homeAddress : null,
        archived: data.archived === true,
      };
    });
    const students: OfficeRouteStudent[] = studentSnapshot.docs.map((snapshot) => {
      const data = snapshot.data() as { familyId?: unknown; status?: unknown; archived?: unknown; transportMode?: unknown };
      const transportMode = data.transportMode === 'bus' || data.transportMode === 'car' || data.transportMode === 'walk' || data.transportMode === 'aftercare'
        ? data.transportMode
        : null;
      return {
        id: snapshot.id,
        familyId: typeof data.familyId === 'string' ? data.familyId : null,
        status: data.status === 'active' || data.status === 'withdrawn' || data.status === 'graduated' ? data.status : null,
        archived: data.archived === true,
        transportMode,
      };
    });

    const geocodeRequested = body.geocodeAddresses === true;
    const referencedFamilyIds = new Set(
      students.flatMap((student) => (student.familyId ? [student.familyId] : [])),
    );
    const familyPoints = geocodeRequested
      ? await geocodeFamilyAddresses(families, referencedFamilyIds)
      : { points: new Map<string, OfficeRoutePoint>(), summary: {
          requested: false,
          attemptedFamilyCount: 0,
          locatedFamilyCount: 0,
          unavailableFamilyCount: 0,
        } satisfies GeocodingSummary };

    // This endpoint only reads. It never writes a route, student, or family record.
    const suggestions = buildOfficeRouteSuggestions({
      students,
      families,
      familyPoints: familyPoints.points,
      schoolPoint,
      existingRouteCapacities: routeSnapshot.docs.filter((snapshot) => snapshot.data().archived !== true).map((snapshot) => {
        const capacity = snapshot.data().capacity;
        return typeof capacity === 'number' && Number.isFinite(capacity) ? capacity : null;
      }),
      options: { maxRoutes, clusterRadiusMeters, defaultCapacity },
    });

    return NextResponse.json(
      {
        suggestions,
        geocoding: familyPoints.summary,
        assignmentsCreated: false,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return jsonError('Could not build route suggestions', 500);
  }
}
