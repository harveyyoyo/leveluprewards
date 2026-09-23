import type {
  OfficeBusAlertKind,
  OfficeBusRoute,
  OfficeBusRun,
  OfficeBusStop,
  OfficeBusTrip,
  OfficeStudent,
  OfficeTransportMode,
} from '@/lib/office/types';
import { scheduleMinutes } from '@/lib/office/officeSchedule';

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

/** Route colours that read well on the map in light and dark. */
export const BUS_ROUTE_COLORS = ['#0f766e', '#2563eb', '#c2410c', '#7c3aed', '#be123c', '#0e7490', '#4d7c0f', '#a16207'];

/** A bus is "near" a stop inside this many metres; used to mark the stop reached automatically. */
export const STOP_ARRIVAL_RADIUS_M = 120;
/** No location for this long while on the road → "not updating" warning. */
export const LOCATION_STALE_MS = 3 * 60_000;
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

function minutesOfDay(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/**
 * How many minutes behind plan the bus is (0 when on time or early), from the next stop's
 * planned time versus now + drive time. Null when there is nothing to compare against.
 */
export function minutesLate(route: OfficeBusRoute, trip: OfficeBusTrip, now = Date.now()): number | null {
  if (trip.status !== 'active') return null;
  const stop = nextStop(route, trip);
  const planned = stop ? stopTime(stop, trip.run) : null;
  if (!stop || !planned) return null;
  const plannedMin = scheduleMinutes(planned);
  if (Number.isNaN(plannedMin)) return null;
  const drive = trip.location ? etaMinutes(trip.location, stop) : 0;
  const expected = minutesOfDay(now) + drive;
  const late = Math.round(expected - plannedMin);
  return late > 0 ? late : 0;
}

export type TransportWarning = {
  id: string;
  tone: 'danger' | 'caution' | 'info';
  routeId: string;
  text: string;
};

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
    const route = routeById.get(trip.routeId);
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
      if (trip.childCheckDone === false) {
        out.push({
          id: `${trip.id}-no-check`,
          tone: 'caution',
          routeId: route.id,
          text: `${bus}: the driver did not confirm the end-of-run bus check.`,
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
    if (!trip.location || now - trip.location.at > LOCATION_STALE_MS) {
      out.push({
        id: `${trip.id}-stale`,
        tone: 'caution',
        routeId: route.id,
        text: trip.location
          ? `${bus} has not sent its location for ${Math.round((now - trip.location.at) / 60_000)} min.`
          : `${bus} started but has not sent a location yet.`,
      });
    }
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
  }
  const rank = { danger: 0, caution: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

function listNames(names: string[]): string {
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

/** "Bus 4 · North" or just the route name. */
export function routeLabel(route: Pick<OfficeBusRoute, 'name' | 'busNumber'>): string {
  const bus = route.busNumber?.trim();
  return bus ? `Bus ${bus} (${route.name})` : route.name;
}

export function ridersForRoute(students: OfficeStudent[], routeId: string): OfficeStudent[] {
  return students.filter((s) => s.transportMode === 'bus' && s.busRouteId === routeId && (s.status ?? 'active') === 'active');
}

/** Short "about 20 sec ago" for the last location. */
export function agoLabel(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} hr ago`;
}

export function clockLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** A plain message staff can paste into a text or email to families. */
export function familyUpdateMessage(route: OfficeBusRoute, trip: OfficeBusTrip | null, now = Date.now()): string {
  const bus = routeLabel(route);
  if (!trip) return `${bus} has not started its run yet.`;
  if (trip.status === 'done') return `${bus} finished its ${BUS_RUN_LABEL[trip.run].toLowerCase()} run at ${clockLabel(trip.endedAt ?? trip.updatedAt)}.`;
  const late = minutesLate(route, trip, now) ?? 0;
  const delay = [...(trip.alerts ?? [])].reverse().find((a) => a.kind === 'delay');
  const lateText = late >= LATE_THRESHOLD_MIN || delay ? ` It is running about ${Math.max(late, delay?.minutes ?? 0)} minutes late.` : ' It is on time.';
  const stop = nextStop(route, trip);
  const stopText = stop && trip.location ? ` Next stop: ${stop.name}, in about ${etaMinutes(trip.location, stop)} min.` : '';
  return `${bus} is on the road.${lateText}${stopText} Thank you for your patience.`;
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

/** Springfield, NJ — the demo schools' town; used until a school sets its own location. */
export const DEFAULT_MAP_CENTER: LatLng = { lat: 40.7051, lng: -74.3174 };

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
