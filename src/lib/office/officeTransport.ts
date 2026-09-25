import type {
  OfficeBusAlertKind,
  OfficeBusLocation,
  OfficeBusReleaseMethod,
  OfficeBusRiderManifestEntry,
  OfficeBusRoute,
  OfficeBusRouteSnapshot,
  OfficeBusRun,
  OfficeBusStop,
  OfficeBusTrip,
  OfficeBusVehicleDetails,
  OfficeFamily,
  OfficeStudent,
  OfficeTransportMode,
} from '@/lib/office/types';
import { formatScheduleTime, scheduleMinutes } from '@/lib/office/officeSchedule';
import { getSchoolDayClock } from '@/lib/attendance/schoolDayClock';
import { getOfficeStudentFullName } from '@/lib/office/officeUtils';

export const TRANSPORT_MODE_LABEL: Record<OfficeTransportMode, string> = {
  bus: 'Bus',
  car: 'Car pickup',
  walk: 'Walks',
  aftercare: 'After care',
};

export const BUS_RUN_LABEL: Record<OfficeBusRun, string> = { am: 'Morning', pm: 'Afternoon' };

export const BUS_ALERT_LABEL: Record<OfficeBusAlertKind, string> = {
  delay: 'Running late',
  breakdown: 'Bus problem',
  accident: 'Accident',
  behavior: 'Student behavior',
  other: 'Note from driver',
};

export const BUS_RELEASE_METHOD_LABEL: Record<OfficeBusReleaseMethod, string> = {
  authorized_contact: 'Family contact',
  id_checked: 'ID checked',
  office_override: 'Office approved',
};

/** Route colours that read well on the map in light and dark. */
export const BUS_ROUTE_COLORS = ['#0f766e', '#2563eb', '#c2410c', '#7c3aed', '#be123c', '#0e7490', '#4d7c0f', '#a16207'];

/** A bus is "near" a stop inside this many metres; used to mark the stop reached automatically. */
export const STOP_ARRIVAL_RADIUS_M = 120;
/** No location for this long while on the road → "not updating" warning. */
export const LOCATION_STALE_MS = 3 * 60_000;
export const ABANDONED_RUN_MIN_AGE_MS = 30 * 60_000;

/** A location is usable only when it is not from the future and is recent enough. */
export function isFreshLocation(location: Pick<OfficeBusLocation, 'at'> | null | undefined, now = Date.now()): boolean {
  return Boolean(location && Number.isFinite(location.at) && now >= location.at && now - location.at <= LOCATION_STALE_MS);
}

/** True when Office may review an active run that has had no fresh location for 30 minutes. */
export function isAbandonedRunCandidate(trip: Pick<OfficeBusTrip, 'status' | 'startedAt' | 'location'>, now = Date.now()): boolean {
  return trip.status === 'active' && Number.isFinite(trip.startedAt) && now >= trip.startedAt && now - trip.startedAt >= ABANDONED_RUN_MIN_AGE_MS && !isFreshLocation(trip.location, now);
}

/** Minutes behind plan before the office sees "late". */
export const LATE_THRESHOLD_MIN = 5;
/** Typical in-town bus speed when the phone does not report one (metres per second ≈ 25 km/h). */
const DEFAULT_SPEED_MPS = 7;

export type LatLng = { lat: number; lng: number };

/** Straight-line distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(m: number): string {
  const miles = m / 1609.344;
  if (miles < 0.1) return `${Math.round(m * 3.281)} ft`;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

export function localIsoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function tripDocId(date: string, routeId: string, run: OfficeBusRun): string {
  return `${date}_${routeId}_${run}`;
}

/** Stops in driving order: morning runs the list as saved, afternoon runs it backwards. */
export function orderedStops(route: Pick<OfficeBusRoute, 'stops'>, run: OfficeBusRun): OfficeBusStop[] {
  const stops = route.stops ?? [];
  return run === 'am' ? stops : [...stops].reverse();
}

export function stopTime(stop: OfficeBusStop, run: OfficeBusRun): string | null {
  return (run === 'am' ? stop.amTime : stop.pmTime) || null;
}

/** Difference from a stop's planned time in minutes; negative means early. */
export function stopMinutesLate(stop: OfficeBusStop, run: OfficeBusRun, arrivedAt: number | null | undefined, timeZone?: string): number | null {
  const planned = stopTime(stop, run);
  if (!planned || arrivedAt == null || !Number.isFinite(arrivedAt)) return null;
  const plannedMinutes = scheduleMinutes(planned);
  if (Number.isNaN(plannedMinutes)) return null;
  return Math.round(minutesOfDay(arrivedAt, timeZone) - plannedMinutes);
}

/** Morning before noon, afternoon after. */
export function currentRun(now = new Date()): OfficeBusRun {
  return now.getHours() < 12 ? 'am' : 'pm';
}

/** The first stop on this run the bus has not reached yet, or null when every stop is done. */
export function nextStop(route: OfficeBusRoute, trip: Pick<OfficeBusTrip, 'run' | 'stopArrivals'>): OfficeBusStop | null {
  const arrivals = trip.stopArrivals ?? {};
  return orderedStops(route, trip.run).find((s) => !arrivals[s.id]) ?? null;
}

/** Rough minutes to reach a point from the bus's last position. */
export function etaMinutes(from: LatLng & { speed?: number | null }, to: LatLng): number {
  const speed = from.speed && from.speed > 2 ? from.speed : DEFAULT_SPEED_MPS;
  // Roads are not straight lines; 1.3 is a common allowance for in-town driving.
  return Math.max(1, Math.round((distanceMeters(from, to) * 1.3) / speed / 60));
}

function minutesOfDay(ms: number, timeZone?: string): number {
  return getSchoolDayClock(ms, timeZone, { whenUnset: 'local' }).minutesSinceMidnight;
}

/**
 * How many minutes behind plan the bus is (0 when on time or early), from the next stop's
 * planned time versus now + drive time. Null when there is nothing to compare against.
 */
export function minutesLate(route: OfficeBusRoute, trip: OfficeBusTrip, now = Date.now(), timeZone?: string): number | null {
  if (trip.status !== 'active' || !isFreshLocation(trip.location, now)) return null;
  const stop = nextStop(route, trip);
  const planned = stop ? stopTime(stop, trip.run) : null;
  if (!stop || !planned) return null;
  const plannedMin = scheduleMinutes(planned);
  if (Number.isNaN(plannedMin)) return null;
  const drive = trip.location ? etaMinutes(trip.location, stop) : 0;
  const expected = minutesOfDay(now, timeZone) + drive;
  const late = Math.round(expected - plannedMin);
  return late > 0 ? late : 0;
}

export type TransportWarning = {
  id: string;
  tone: 'danger' | 'caution' | 'info';
  routeId: string;
  text: string;
};

export function gpsMissedStopWarning(
  route: OfficeBusRoute,
  trip: OfficeBusTrip,
  now = Date.now(),
  timeZone?: string,
): TransportWarning | null {
  if (trip.status !== 'active' || trip.id.startsWith('practice-')) return null;
  const location = trip.location;
  const trustedTracker = trip.locationSource === 'gps_device' || location?.source === 'gps_device';
  if (!trustedTracker || !isFreshLocation(location, now)) return null;
  const next = nextStop(route, trip);
  if (!next || trip.stopArrivalDetails?.[next.id]) return null;
  const planned = stopTime(next, trip.run);
  if (!planned) return null;
  const plannedMinutes = scheduleMinutes(planned);
  if (Number.isNaN(plannedMinutes)) return null;
  const lateBy = minutesOfDay(now, timeZone) - plannedMinutes;
  if (lateBy < LATE_THRESHOLD_MIN) return null;
  return {
    id: `${trip.id}-gps-missed`,
    tone: 'caution',
    routeId: route.id,
    text: `${routeLabel(route)}: the GPS tracker is ${Math.round(lateBy)} min past the planned time for ${next.name}, but that stop is not marked reached.`,
  };
}

export function trackerSourceLabel(trip: Pick<OfficeBusTrip, 'gpsDeviceId' | 'locationSource' | 'location'>): string {
  if (trip.locationSource === 'gps_device' || trip.location?.source === 'gps_device' || trip.gpsDeviceId) return 'GPS tracker';
  if (trip.locationSource === 'browser' || trip.location?.source === 'browser') return "Driver's phone";
  return 'No tracker assigned';
}

/** Everything the office should notice about today's runs, most urgent first. */
export function tripWarnings(
  routes: OfficeBusRoute[],
  trips: OfficeBusTrip[],
  studentNameById: Map<string, string>,
  now = Date.now(),
): TransportWarning[] {
  const routeById = new Map(routes.map((r) => [r.id, r]));
  const out: TransportWarning[] = [];
  for (const trip of trips) {
    const route = routeForTrip(routeById.get(trip.routeId), trip);
    if (!route) continue;
    const bus = routeLabel(route);
    const runLabel = BUS_RUN_LABEL[trip.run].toLowerCase();
    const stillOn = Object.entries(trip.riders ?? {})
      .filter(([, r]) => r.status === 'on')
      .map(([id]) => studentNameById.get(id) ?? 'A student');

    if (trip.status === 'done') {
      if (stillOn.length) {
        out.push({
          id: `${trip.id}-left-on`,
          tone: 'danger',
          routeId: route.id,
          text: `${bus} finished the ${runLabel} run but ${listNames(stillOn)} ${stillOn.length === 1 ? 'was' : 'were'} never marked off.`,
        });
      }
      if (trip.childCheckDone !== true) {
        out.push({
          id: `${trip.id}-no-check`,
          tone: 'caution',
          routeId: route.id,
          text: trip.closedByOffice
            ? `${bus}: School Office closed this older run without a finishing bus check.`
            : `${bus}: the driver did not confirm the end-of-run bus check.`,
        });
      }
      continue;
    }

    for (const alert of trip.alerts ?? []) {
      if (now - alert.at > 2 * 60 * 60_000) continue;
      out.push({
        id: alert.id,
        tone: alert.kind === 'accident' || alert.kind === 'breakdown' ? 'danger' : alert.kind === 'delay' ? 'caution' : 'info',
        routeId: route.id,
        text: `${bus}: ${BUS_ALERT_LABEL[alert.kind]}${alert.minutes ? ` (about ${alert.minutes} min)` : ''}${alert.message ? ` — ${alert.message}` : ''}`,
      });
    }
    if (!isFreshLocation(trip.location, now)) {
      const locationAgeMinutes = trip.location ? Math.max(0, Math.round((now - trip.location.at) / 60_000)) : 0;
      out.push({
        id: `${trip.id}-stale`,
        tone: 'caution',
        routeId: route.id,
        text: trip.location
          ? trip.locationSource === 'gps_device' || trip.location.source === 'gps_device'
            ? `${bus} GPS tracker has not sent a location for ${locationAgeMinutes} min.`
            : `${bus} driver phone has not sent a location for ${locationAgeMinutes} min.`
          : trip.locationSource === 'gps_device'
            ? `${bus} started, but the GPS tracker has not sent a location yet.`
            : `${bus} started, but the driver's phone has not sent a location yet.`,
      });
    }
    const missed = gpsMissedStopWarning(route, trip, now);
    if (missed) out.push(missed);
    const late = minutesLate(route, trip, now);
    if (late !== null && late >= LATE_THRESHOLD_MIN) {
      out.push({ id: `${trip.id}-late`, tone: 'caution', routeId: route.id, text: `${bus} is running about ${late} min behind plan.` });
    }
    const onBoard = stillOn.length;
    if (route.capacity && onBoard > route.capacity) {
      out.push({
        id: `${trip.id}-full`,
        tone: 'caution',
        routeId: route.id,
        text: `${bus} has ${onBoard} riders on board but only ${route.capacity} seats.`,
      });
    }
    const missingReleases = Object.entries(trip.riders ?? {})
      .filter(([studentId, rider]) => rider.status === 'off' && !trip.releases?.[studentId])
      .map(([studentId]) => studentNameById.get(studentId) ?? 'A rider');
    if (route.requireReleaseConfirmations === true && (trip.releases != null || trip.riderManifest != null) && missingReleases.length > 0) {
      out.push({
        id: `${trip.id}-release`,
        tone: 'caution',
        routeId: route.id,
        text: `${bus}: release not recorded for ${listNames(missingReleases)}.`,
      });
    }
  }
  const rank = { danger: 0, caution: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

export type TransportDaySummary = {
  totalRuns: number;
  completedRuns: number;
  activeRuns: number;
  riderRides: number;
  alertCount: number;
  averageMinutes: number | null;
  lateRuns: number;
};

/** Counts for a selected day in History, without changing any safety record. */
export function transportDaySummary(
  trips: OfficeBusTrip[],
  routes: OfficeBusRoute[],
  now = Date.now(),
): TransportDaySummary {
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const completedTrips = trips.filter((trip) => trip.status === 'done');
  const durations = completedTrips
    .filter((trip): trip is OfficeBusTrip & { endedAt: number } => typeof trip.endedAt === 'number')
    .map((trip) => Math.max(0, trip.endedAt - trip.startedAt));
  const averageMs = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null;
  const lateRuns = trips.filter((trip) => {
    if (trip.status !== 'active') return false;
    const route = routeForTrip(routeById.get(trip.routeId), trip);
    return route ? (minutesLate(route, trip, now) ?? 0) >= LATE_THRESHOLD_MIN : false;
  }).length;

  return {
    totalRuns: trips.length,
    completedRuns: completedTrips.length,
    activeRuns: trips.length - completedTrips.length,
    riderRides: trips.reduce(
      (sum, trip) => sum + Object.values(trip.riders ?? {}).filter((rider) => rider.status === 'on' || rider.status === 'off').length,
      0,
    ),
    alertCount: trips.reduce((sum, trip) => sum + (trip.alerts?.length ?? 0), 0),
    averageMinutes: averageMs === null ? null : Math.max(1, Math.round(averageMs / 60_000)),
    lateRuns,
  };
}

/** A short plain-text summary staff can paste into a report or message. */
export function transportDaySummaryText(date: string, summary: TransportDaySummary): string {
  const lines = [
    `Transportation report — ${date}`,
    `${summary.totalRuns} run${summary.totalRuns === 1 ? '' : 's'}: ${summary.completedRuns} finished, ${summary.activeRuns} active`,
    `${summary.riderRides} rider ride${summary.riderRides === 1 ? '' : 's'}`,
    `${summary.alertCount} driver report${summary.alertCount === 1 ? '' : 's'}`,
    summary.averageMinutes === null ? null : `Average finished run: ${summary.averageMinutes} minutes`,
    summary.lateRuns ? `${summary.lateRuns} run${summary.lateRuns === 1 ? '' : 's'} running late` : null,
  ];
  return lines.filter((line): line is string => Boolean(line)).join('\n');
}

function listNames(names: string[]): string {
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

export type RouteReadiness = {
  ready: boolean;
  hasPickupStop: boolean;
  hasSchoolStop: boolean;
  missing: string[];
};

/** The same basic readiness rule the trusted start endpoint enforces. */
export function routeReadiness(route: Pick<OfficeBusRoute, 'stops'>): RouteReadiness {
  const stops = route.stops ?? [];
  const hasPickupStop = stops.some((stop) => !stop.isSchool);
  const hasSchoolStop = stops.some((stop) => stop.isSchool);
  const schoolIndex = stops.findIndex((stop) => stop.isSchool);
  const missing = [
    ...(!hasPickupStop ? ['a student stop'] : []),
    ...(!hasSchoolStop ? ['the school stop'] : []),
    ...(schoolIndex >= 0 && schoolIndex !== stops.length - 1 ? ['the school as the last stop'] : []),
  ];
  return { ready: missing.length === 0, hasPickupStop, hasSchoolStop, missing };
}

export function vehicleLabel(vehicle: OfficeBusVehicleDetails | null | undefined): string | null {
  if (!vehicle) return null;
  const identity = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
  return [identity || vehicle.plate || null, vehicle.plate && identity ? `· ${vehicle.plate}` : ''].filter(Boolean).join(' ') || null;
}

export function vehicleDueLabel(vehicle: OfficeBusVehicleDetails | null | undefined, now = Date.now()): string | null {
  if (!vehicle) return null;
  const today = localIsoDate(new Date(now));
  const daysUntil = (value: string | null | undefined): number | null => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const due = new Date(`${value}T12:00:00`);
    const current = new Date(`${today}T12:00:00`);
    if (Number.isNaN(due.getTime()) || Number.isNaN(current.getTime())) return null;
    return Math.round((due.getTime() - current.getTime()) / 86_400_000);
  };
  const inspectionDays = daysUntil(vehicle.inspectionDue);
  const insuranceDays = daysUntil(vehicle.insuranceDue);
  if (inspectionDays != null && inspectionDays < 0) return 'Inspection overdue';
  if (insuranceDays != null && insuranceDays < 0) return 'Insurance overdue';
  const dueSoon = (label: string, days: number) => (days === 0 ? `${label} due today` : `${label} due in ${days} day${days === 1 ? '' : 's'}`);
  if (inspectionDays != null && inspectionDays <= 30) return dueSoon('Inspection', inspectionDays);
  if (insuranceDays != null && insuranceDays <= 30) return dueSoon('Insurance', insuranceDays);
  return null;
}

export function latestMaintenanceLabel(vehicle: OfficeBusVehicleDetails | null | undefined): string | null {
  const latest = (vehicle?.maintenanceLog ?? [])
    .filter((entry) => entry.archived !== true)
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))[0];
  return latest ? `${latest.serviceDate} · ${latest.serviceType}` : null;
}

/** "Bus 4 · North" or just the route name. */
export function routeLabel(route: Pick<OfficeBusRoute, 'name' | 'busNumber'>): string {
  const bus = route.busNumber?.trim();
  return bus ? `Bus ${bus} (${route.name})` : route.name;
}

export type OfficeDriverRunSheet = {
  routeName: string;
  busNumber: string;
  run: OfficeBusRun;
  stops: Array<{ order: number; name: string; plannedTime: string | null; riders: string[] }>;
};

/** Build a driver-only sheet with no family, contact, address, class, note, or coordinate fields. */
export function buildDriverRunSheet(
  route: Pick<OfficeBusRoute, 'id' | 'name' | 'busNumber' | 'stops'>,
  students: Array<Pick<OfficeStudent, 'id' | 'firstName' | 'lastName' | 'nickname' | 'busRouteId' | 'busStopId' | 'transportMode' | 'status' | 'archived'>>,
  run: OfficeBusRun,
): OfficeDriverRunSheet {
  const riders = students
    .filter((student) => student.transportMode === 'bus' && student.busRouteId === route.id && (student.status ?? 'active') === 'active' && student.archived !== true)
    .sort((a, b) => getOfficeStudentFullName(a).localeCompare(getOfficeStudentFullName(b), undefined, { numeric: true }));
  return {
    routeName: route.name,
    busNumber: route.busNumber?.trim() ?? '',
    run,
    stops: orderedStops(route, run).map((stop, index) => ({
      order: index + 1,
      name: stop.name,
      plannedTime: stopTime(stop, run),
      riders: riders.filter((student) => student.busStopId === stop.id).map((student) => getOfficeStudentFullName(student)),
    })),
  };
}

export type OfficeFamilyStopPlan = {
  name: string;
  morningTime: string | null;
  afternoonTime: string | null;
};

/** Return only the stops assigned to one family, never the rest of the route. */
export function familyStopPlans(route: Pick<OfficeBusRoute, 'stops'>, stopIds: Iterable<string>): OfficeFamilyStopPlan[] {
  const requested = new Set([...stopIds].filter(Boolean));
  return route.stops
    .filter((stop) => !stop.isSchool && requested.has(stop.id))
    .map((stop) => ({ name: stop.name, morningTime: stop.amTime ?? null, afternoonTime: stop.pmTime ?? null }));
}

/** The newest active trip for a route/run, or the newest completed trip if none is active. */
export function latestTripForRoute(
  trips: OfficeBusTrip[],
  routeId: string,
  run: OfficeBusRun,
): OfficeBusTrip | null {
  const candidates = trips.filter((trip) => trip.routeId === routeId && trip.run === run);
  return candidates.reduce<OfficeBusTrip | null>((latest, trip) => {
    if (!latest) return trip;
    if (trip.status !== latest.status) return trip.status === 'active' ? trip : latest;
    return trip.startedAt > latest.startedAt ? trip : latest;
  }, null);
}

/** Capture the route choices that must stay fixed for the whole run. */
export function routeSnapshotForRun(route: OfficeBusRoute): OfficeBusRouteSnapshot {
  return {
    name: route.name,
    busNumber: route.busNumber ?? null,
    color: route.color,
    vehicle: route.vehicle ?? null,
    stops: route.stops,
    capacity: route.capacity ?? null,
    driverName: route.driverName ?? null,
    driverPhone: route.driverPhone ?? null,
    ...(route.reliefDriverName != null || route.reliefDriverPhone != null
      ? { reliefDriverName: route.reliefDriverName ?? null, reliefDriverPhone: route.reliefDriverPhone ?? null }
      : {}),
    notifyFamiliesOnAlert: route.notifyFamiliesOnAlert === true,
    notifyFamiliesOnArrival: route.notifyFamiliesOnArrival === true,
    requireReleaseConfirmations: route.requireReleaseConfirmations === true,
  };
}

/** Use the route captured at trip start so old history does not change when a route is edited. */
export function routeForTrip(route: OfficeBusRoute | undefined, trip: OfficeBusTrip): OfficeBusRoute | undefined {
  const snapshot = trip.routeSnapshot;
  if (!snapshot) return route;
  return {
    id: route?.id ?? trip.routeId,
    name: snapshot.name,
    busNumber: snapshot.busNumber ?? null,
    color: snapshot.color,
    driverName: snapshot.driverName ?? route?.driverName ?? null,
    driverPhone: snapshot.driverPhone ?? route?.driverPhone ?? null,
    ...(snapshot.reliefDriverName != null || snapshot.reliefDriverPhone != null || route?.reliefDriverName != null || route?.reliefDriverPhone != null
      ? { reliefDriverName: snapshot.reliefDriverName ?? route?.reliefDriverName ?? null, reliefDriverPhone: snapshot.reliefDriverPhone ?? route?.reliefDriverPhone ?? null }
      : {}),
    capacity: snapshot.capacity ?? route?.capacity ?? null,
    vehicle: snapshot.vehicle ?? route?.vehicle ?? null,
    notifyFamiliesOnAlert: snapshot.notifyFamiliesOnAlert ?? route?.notifyFamiliesOnAlert === true,
    notifyFamiliesOnArrival: snapshot.notifyFamiliesOnArrival ?? route?.notifyFamiliesOnArrival === true,
    requireReleaseConfirmations: snapshot.requireReleaseConfirmations ?? route?.requireReleaseConfirmations === true,
    stops: snapshot.stops ?? [],
    notes: route?.notes ?? null,
    updatedAt: route?.updatedAt ?? trip.updatedAt,
    updatedBy: route?.updatedBy ?? null,
    archived: route?.archived,
    archivedAt: route?.archivedAt,
  };
}

export type OfficeBusPhoneStatus = {
  status: 'not_started' | 'on_way' | 'delayed' | 'arrived' | 'ended' | 'unavailable';
  text: string;
  asOf: number;
};

/** A short, privacy-safe message suitable for a school phone line or preview. */
export function transportPhoneStatusText(route: OfficeBusRoute, trip: OfficeBusTrip | null | undefined, now = Date.now(), timeZone?: string): OfficeBusPhoneStatus {
  const activeRoute = trip ? routeForTrip(route, trip) ?? route : route;
  const bus = routeLabel(activeRoute);
  const disclaimer = 'This is bus information, not confirmation that a child got off.';
  if (!trip) {
    return { status: 'not_started', asOf: now, text: `${bus} is not on a run right now. Please call the school for help. ${disclaimer}` };
  }
  if (trip.status === 'done') {
    if (trip.closedByOffice) {
      return { status: 'ended', asOf: trip.closedAt ?? trip.endedAt ?? trip.updatedAt, text: `${bus} is not on the road. The School Office closed an older unfinished run. ${disclaimer}` };
    }
    const ended = trip.endedAt ? ` The run finished at ${clockLabel(trip.endedAt, timeZone)}.` : ' The run is finished.';
    return { status: 'ended', asOf: now, text: `${bus} is not on the road.${ended} ${disclaimer}` };
  }
  if (!trip.location) {
    return { status: 'unavailable', asOf: now, text: `${bus} started the ${BUS_RUN_LABEL[trip.run].toLowerCase()} run, but its location is not available yet. ${disclaimer}` };
  }
  if (!isFreshLocation(trip.location, now)) {
    return { status: 'unavailable', asOf: trip.location.at, text: `${bus} tracking is temporarily unavailable. Last update: ${clockLabel(trip.location.at, timeZone)}. ${disclaimer}` };
  }
  const next = nextStop(activeRoute, trip);
  if (!next) {
    return { status: 'arrived', asOf: trip.location.at, text: `${bus} has reached the last stop on this run. ${disclaimer}` };
  }
  const late = minutesLate(activeRoute, trip, now, timeZone);
  const eta = etaMinutes(trip.location, next);
  const planned = stopTime(next, trip.run);
  const plannedText = planned ? ` Planned time: ${formatScheduleTime(planned)}.` : '';
  const lateText = late != null && late >= LATE_THRESHOLD_MIN ? ` It is running about ${late} minutes behind plan.` : '';
  return {
    status: late != null && late >= LATE_THRESHOLD_MIN ? 'delayed' : 'on_way',
    asOf: trip.location.at,
    text: `${bus} is expected at ${next.name} in about ${eta} minutes.${lateText}${plannedText} Last update: ${clockLabel(trip.location.at, timeZone)}. ${disclaimer}`,
  };
}

export function riderNameForTrip(trip: OfficeBusTrip, studentId: string, currentNames: Map<string, string>): string {
  return trip.riderManifest?.find((entry) => entry.studentId === studentId)?.displayName || currentNames.get(studentId) || 'Former student';
}

export function missingReleaseStudentIds(trip: OfficeBusTrip): string[] {
  const ids = new Set([
    ...(trip.riderManifest?.map((entry) => entry.studentId) ?? []),
    ...(trip.riderSnapshot ?? []),
    ...Object.keys(trip.riders ?? {}),
  ]);
  return [...ids].filter((studentId) => trip.riders?.[studentId]?.status === 'off' && !trip.releases?.[studentId]);
}

export function ridersForRoute(students: OfficeStudent[], routeId: string): OfficeStudent[] {
  return students.filter((s) => s.transportMode === 'bus' && s.busRouteId === routeId && (s.status ?? 'active') === 'active');
}

/** Ids are the immutable rider list captured when a run begins. */
export function riderSnapshotFromStudents(
  students: Array<Pick<OfficeStudent, 'id' | 'transportMode' | 'status' | 'archived'>>,
): string[] {
  return students
    .filter((student) => student.transportMode === 'bus' && (student.status ?? 'active') === 'active' && student.archived !== true)
    .map((student) => student.id)
    .filter(Boolean)
    .sort();
}

/** Captures the names and stops a driver saw when the run began. */
export function riderManifestFromStudents(
  students: Array<
    Pick<OfficeStudent, 'id' | 'firstName' | 'lastName' | 'nickname' | 'familyId' | 'busStopId' | 'transportMode' | 'status' | 'archived'>
  >,
): OfficeBusRiderManifestEntry[] {
  return students
    .filter((student) => student.transportMode === 'bus' && (student.status ?? 'active') === 'active' && student.archived !== true)
    .map((student) => ({
      studentId: student.id,
      displayName: getOfficeStudentFullName(student) || 'Student',
      familyId: student.familyId ?? null,
      busStopId: student.busStopId ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { numeric: true }) || a.studentId.localeCompare(b.studentId));
}

/** Short "about 20 sec ago" for the last location. */
export function agoLabel(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} hr ago`;
}

export function clockLabel(ms: number, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', ...(timeZone ? { timeZone } : {}) }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
}

/** A plain message staff can paste into a text or email to families. */
export function familyUpdateMessage(route: OfficeBusRoute, trip: OfficeBusTrip | null, now = Date.now(), timeZone?: string): string {
  const bus = routeLabel(route);
  if (!trip) return `${bus} has not started its run yet.`;
  if (trip.status === 'done') {
    return trip.closedByOffice
      ? `${bus} had an older run closed by the School Office without a finishing check.`
      : `${bus} finished its ${BUS_RUN_LABEL[trip.run].toLowerCase()} run at ${clockLabel(trip.endedAt ?? trip.updatedAt, timeZone)}.`;
  }
  const hasFreshLocation = isFreshLocation(trip.location, now);
  const late = hasFreshLocation ? minutesLate(route, trip, now, timeZone) ?? 0 : null;
  const recentDelay = [...(trip.alerts ?? [])].reverse().find((a) => a.kind === 'delay' && a.at <= now && now - a.at <= 2 * 60 * 60_000);
  const lateText = !hasFreshLocation
    ? ' The bus location is not available right now.'
    : late !== null && (late >= LATE_THRESHOLD_MIN || recentDelay)
      ? ` It is running about ${Math.max(late, recentDelay?.minutes ?? 0)} minutes late.`
      : ' It is on time.';
  const stop = nextStop(route, trip);
  const stopText = stop && trip.location && hasFreshLocation ? ` Next stop: ${stop.name}, in about ${etaMinutes(trip.location, stop)} min.` : '';
  return `${bus} is on the road.${lateText}${stopText} Thank you for your patience.`;
}

/** Unique family email addresses for the riders on a route, safe to put in BCC. */
export function transportFamilyEmails(
  students: OfficeStudent[],
  familyById: Map<string, OfficeFamily>,
  routeId: string,
  trip?: Pick<OfficeBusTrip, 'riderSnapshot' | 'riderManifest'> | null,
): string[] {
  const riderIds = trip?.riderSnapshot ? new Set(trip.riderSnapshot) : null;
  const assigned = students.filter(
    (student) =>
      student.transportMode === 'bus' &&
      student.busRouteId === routeId &&
      (student.status ?? 'active') === 'active' &&
      student.archived !== true &&
      (!riderIds || riderIds.has(student.id)),
  );
  const familyIds = new Set<string>();
  for (const entry of trip?.riderManifest ?? []) {
    if (entry.familyId) familyIds.add(entry.familyId);
  }
  for (const student of assigned) {
    if (student.familyId) familyIds.add(student.familyId);
  }
  const emails = new Set<string>();
  for (const familyId of familyIds) {
    for (const contact of familyById.get(familyId)?.contacts ?? []) {
      if (contact.transportNotificationsEnabled === false) continue;
      const email = contact.email?.trim().toLowerCase();
      if (email) emails.add(email);
    }
  }
  return [...emails].sort();
}

/**
 * Point along the route's stops for a practice run, `t` from 0 (first stop) to 1 (last stop).
 * Straight lines between stops, same as the map draws them.
 */
export function pointAlongStops(stops: LatLng[], t: number): LatLng & { segment: number } {
  if (stops.length === 0) return { lat: 0, lng: 0, segment: 0 };
  if (stops.length === 1) return { ...stops[0], segment: 0 };
  const lengths = stops.slice(1).map((s, i) => distanceMeters(stops[i], s));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  let target = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] ? Math.min(1, target / lengths[i]) : 1;
      return {
        lat: stops[i].lat + (stops[i + 1].lat - stops[i].lat) * f,
        lng: stops[i].lng + (stops[i + 1].lng - stops[i].lng) * f,
        segment: i,
      };
    }
    target -= lengths[i];
  }
  return { ...stops[stops.length - 1], segment: lengths.length - 1 };
}

export function newTransportId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Neutral fallback until a school sets its own location; real routes use their first stop. */
export const DEFAULT_MAP_CENTER: LatLng = { lat: 39.5, lng: -98.35 };

/**
 * Three example routes around the school so a new page is not empty. Times are typical:
 * morning pickups 7:15–7:50, afternoon drop-offs 3:10–3:45.
 */
export function exampleRoutes(school: LatLng): Array<Omit<OfficeBusRoute, 'id' | 'updatedAt'>> {
  const off = (dLat: number, dLng: number): LatLng => ({ lat: school.lat + dLat, lng: school.lng + dLng });
  const make = (
    name: string,
    busNumber: string,
    color: string,
    driverName: string,
    points: Array<[string, number, number]>,
  ): Omit<OfficeBusRoute, 'id' | 'updatedAt'> => ({
    name,
    busNumber,
    color,
    driverName,
    driverPhone: null,
    capacity: 48,
    notifyFamiliesOnAlert: false,
    notifyFamiliesOnArrival: false,
    requireReleaseConfirmations: false,
    notes: null,
    stops: [
      ...points.map(([stopName, dLat, dLng], i) => ({
        id: newTransportId('stop'),
        name: stopName,
        address: null,
        ...off(dLat, dLng),
        amTime: `07:${String(15 + i * 8).padStart(2, '0')}`,
        pmTime: `15:${String(10 + (points.length - i) * 8).padStart(2, '0')}`,
      })),
      { id: newTransportId('stop'), name: 'School', address: null, ...school, amTime: '07:55', pmTime: '15:05', isSchool: true },
    ],
  });
  return [
    make('North', '4', BUS_ROUTE_COLORS[0], 'Pat Rivera', [
      ['Oak St & 5th', 0.021, -0.006],
      ['Maple Ave Park', 0.014, 0.004],
      ['Cedar Lane', 0.007, -0.002],
    ]),
    make('East', '7', BUS_ROUTE_COLORS[1], 'Sam Chen', [
      ['Elm Rd Library', 0.004, 0.026],
      ['Birch Court', -0.003, 0.017],
      ['Willow Way', 0.002, 0.008],
    ]),
    make('South', '12', BUS_ROUTE_COLORS[2], 'Jordan Blake', [
      ['Pine St Shops', -0.022, 0.003],
      ['Chestnut Drive', -0.014, -0.007],
      ['Hillside Ave', -0.006, -0.003],
    ]),
  ];
}
