import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import { clientIp, jsonError, rateLimit } from '@/lib/server/apiSecurity';
import { transportParentAccessIsUsable } from '@/lib/office/transportParentAccess';
import {
  TRANSPORT_PARENT_COOKIE_NAME,
  verifyTransportParentSession,
} from '@/lib/server/transportParentSession';
import {
  etaMinutes,
  latestTripForRoute,
  nextStop,
  routeForTrip,
  routeLabel,
  transportPhoneStatusText,
  LOCATION_STALE_MS,
} from '@/lib/office/officeTransport';
import type { OfficeBusLocation, OfficeBusRoute, OfficeBusTrip, OfficeFamily, OfficeStudent } from '@/lib/office/types';
import type { OfficeTransportParentAccess } from '@/lib/office/transportParentAccess';

export const dynamic = 'force-dynamic';

const SCHOOL_ID_RE = /^[a-z0-9_-]{1,80}$/;

function noStore() {
  return { 'Cache-Control': 'no-store' };
}

function safeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function GET(req: NextRequest) {
  try {
    if (!rateLimit(`transport-parent-status:${clientIp(req)}`, 60)) return jsonError(429, 'Too many requests.');
    const schoolId = (req.nextUrl.searchParams.get('schoolId') ?? '').trim().toLowerCase();
    if (!SCHOOL_ID_RE.test(schoolId)) return jsonError(400, 'A valid school is required.');

    const raw = req.cookies.get(TRANSPORT_PARENT_COOKIE_NAME)?.value;
    if (!raw) return jsonError(401, 'Sign in with your private bus access code.');
    const session = await verifyTransportParentSession(raw);
    if (!session || session.schoolId !== schoolId) return jsonError(401, 'Your bus access has expired. Sign in again.');

    const db = await getFirebaseAdminFirestore();
    const school = db.collection('schools').doc(schoolId);
    const accessRef = school.collection('officeTransportParentAccess').doc(session.accessId);
    const accessSnap = await accessRef.get();
    const access = accessSnap.exists ? ({ id: accessSnap.id, ...accessSnap.data() } as OfficeTransportParentAccess) : null;
    if (!access || !transportParentAccessIsUsable(access)) return jsonError(401, 'This bus access is no longer active.');

    const familySnap = await school.collection('officeFamilies').doc(access.familyId).get();
    if (!familySnap.exists || familySnap.data()?.archived === true) return jsonError(404, 'The family bus assignment was not found.');
    const family = { id: familySnap.id, ...familySnap.data() } as OfficeFamily;

    const studentSnap = await school.collection('officeStudents').where('familyId', '==', family.id).limit(200).get();
    const students = studentSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as OfficeStudent));
    const routeIds = [...new Set(students
      .filter((student) => student.archived !== true && (student.status == null || student.status === 'active') && (student.transportMode == null || student.transportMode === 'bus') && typeof student.busRouteId === 'string')
      .map((student) => student.busRouteId as string))].slice(0, 10);

    const buses = await Promise.all(routeIds.map(async (routeId) => {
      const [routeSnap, tripSnap] = await Promise.all([
        school.collection('officeBusRoutes').doc(routeId).get(),
        school.collection('officeBusTrips').where('routeId', '==', routeId).limit(100).get(),
      ]);
      if (!routeSnap.exists || routeSnap.data()?.archived === true) return null;
      const route = { id: routeSnap.id, ...routeSnap.data() } as OfficeBusRoute;
      const trips = tripSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as OfficeBusTrip));
      const trip = trips.slice().sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return b.startedAt - a.startedAt;
      })[0] ?? latestTripForRoute(trips, routeId, 'am');
      const status = transportPhoneStatusText(route, trip);
      const activeRoute = trip ? routeForTrip(route, trip) ?? route : route;
      const stop = trip ? nextStop(activeRoute, trip) : null;
      const location = trip?.location as OfficeBusLocation | null | undefined;
      const eta = trip && location && stop ? etaMinutes(location, stop) : null;
      return {
        routeId,
        busLabel: routeLabel(activeRoute),
        run: trip?.run ?? null,
        state: status.status,
        message: status.text,
        nextStopName: stop?.name ?? null,
        etaMinutes: eta,
        lastUpdateAt: safeNumber(location?.at),
        stale: Boolean(location && Date.now() - location.at > LOCATION_STALE_MS),
      };
    }));

    return NextResponse.json({
      familyName: family.displayName,
      arrivalPreferences: access.arrivalPreferences ?? { email: false, sms: false, whatsapp: false, updatedAt: access.updatedAt },
      buses: buses.filter((bus): bus is NonNullable<typeof bus> => bus !== null),
      checkedAt: Date.now(),
    }, { headers: noStore() });
  } catch {
    return jsonError(503, 'Private bus status is temporarily unavailable.');
  }
}
