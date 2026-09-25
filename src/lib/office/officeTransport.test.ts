import { describe, expect, it } from 'vitest';
import {
  buildDriverRunSheet,
  distanceMeters,
  exampleRoutes,
  familyStopPlans,
  familyUpdateMessage,
  gpsMissedStopWarning,
  isAbandonedRunCandidate,
  isFreshLocation,
  latestMaintenanceLabel,
  latestTripForRoute,
  minutesLate,
  missingReleaseStudentIds,
  nextStop,
  orderedStops,
  pointAlongStops,
  riderManifestFromStudents,
  riderNameForTrip,
  riderSnapshotFromStudents,
  routeForTrip,
  routeReadiness,
  routeSnapshotForRun,
  stopMinutesLate,
  transportDaySummary,
  transportDaySummaryText,
  transportFamilyEmails,
  transportPhoneStatusText,
  tripWarnings,
  vehicleDueLabel,
  vehicleLabel,
} from '@/lib/office/officeTransport';
import type { OfficeBusRoute, OfficeBusTrip, OfficeStudent } from '@/lib/office/types';

const route: OfficeBusRoute = {
  id: 'r1',
  name: 'North',
  busNumber: '4',
  color: '#0f766e',
  capacity: 1,
  stops: [
    { id: 'a', name: 'Oak', lat: 40.72, lng: -74.32, amTime: '07:15', pmTime: '15:30' },
    { id: 'b', name: 'Maple', lat: 40.71, lng: -74.31, amTime: '07:25', pmTime: '15:20' },
    { id: 's', name: 'School', lat: 40.705, lng: -74.317, amTime: '07:40', pmTime: '15:05', isSchool: true },
  ],
  updatedAt: 0,
};

function at(hh: number, mm: number): number {
  const d = new Date(2026, 8, 23, hh, mm, 0);
  return d.getTime();
}

function trip(p: Partial<OfficeBusTrip> = {}): OfficeBusTrip {
  return {
    id: 't1',
    routeId: 'r1',
    date: '2026-09-23',
    run: 'am',
    status: 'active',
    startedAt: at(7, 0),
    stopArrivals: {},
    riders: {},
    alerts: [],
    updatedAt: at(7, 0),
    ...p,
  };
}

describe('officeTransport', () => {
  it('keeps relief-driver details in the saved Office route snapshot', () => {
    const snapshot = routeSnapshotForRun({ ...route, reliefDriverName: 'Jordan Lee', reliefDriverPhone: '+15550000010' });
    expect(snapshot.reliefDriverName).toBe('Jordan Lee');
    expect(snapshot.reliefDriverPhone).toBe('+15550000010');
  });

  it('runs the afternoon in reverse', () => {
    expect(orderedStops(route, 'am').map((s) => s.id)).toEqual(['a', 'b', 's']);
    expect(orderedStops(route, 'pm').map((s) => s.id)).toEqual(['s', 'b', 'a']);
  });

  it('shows when a route needs a student stop and school stop', () => {
    expect(routeReadiness(route)).toMatchObject({ ready: true, missing: [] });
    expect(routeReadiness({ stops: [{ id: 'a', name: 'Oak', lat: 40.7, lng: -74.3 }] })).toMatchObject({
      ready: false,
      missing: ['the school stop'],
    });
  });

  it('returns only the family assigned stops for a parent plan', () => {
    expect(familyStopPlans(route, ['b', 'missing', 'b'])).toEqual([
      { name: 'Maple', morningTime: '07:25', afternoonTime: '15:20' },
    ]);
  });

  it('builds a driver sheet without family, contact, class, note, or location details', () => {
    const student = {
      id: 's1',
      firstName: 'Avery',
      lastName: 'Lee',
      nickname: '',
      familyId: 'family-secret',
      busRouteId: 'r1',
      busStopId: 'a',
      transportMode: 'bus',
      status: 'active',
      archived: false,
      phone: '+15550000000',
      email: 'private@example.com',
      classId: 'class-secret',
      medicalNotes: 'private note',
    } as unknown as OfficeStudent;
    const sheet = buildDriverRunSheet(route, [student], 'am');
    expect(sheet).toEqual({
      routeName: 'North',
      busNumber: '4',
      run: 'am',
      stops: [
        { order: 1, name: 'Oak', plannedTime: '07:15', riders: ['Avery Lee'] },
        { order: 2, name: 'Maple', plannedTime: '07:25', riders: [] },
        { order: 3, name: 'School', plannedTime: '07:40', riders: [] },
      ],
    });
    const serialized = JSON.stringify(sheet);
    expect(serialized).not.toContain('family-secret');
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('+15550000000');
    expect(serialized).not.toContain('class-secret');
    expect(serialized).not.toContain('private note');
  });

  it('flags a school stop that is not last in the morning route', () => {
    expect(routeReadiness({ ...route, stops: [route.stops[2], route.stops[0], route.stops[1]] })).toMatchObject({
      ready: false,
      missing: ['the school as the last stop'],
    });
  });

  it('summarizes vehicle identity and overdue dates', () => {
    const vehicle = { year: 2022, make: 'Ford', model: 'Transit', plate: 'BUS-4', inspectionDue: '2026-01-01' };
    expect(vehicleLabel(vehicle)).toBe('2022 Ford Transit · BUS-4');
    expect(vehicleDueLabel(vehicle, at(2, 0))).toBe('Inspection overdue');
  });

  it('warns before vehicle dates are due', () => {
    expect(vehicleDueLabel({ inspectionDue: '2026-10-01' }, at(2, 0))).toBe('Inspection due in 8 days');
    expect(vehicleDueLabel({ insuranceDue: '2026-11-15' }, at(2, 0))).toBeNull();
  });

  it('shows the newest visible service record', () => {
    expect(
      latestMaintenanceLabel({
        maintenanceLog: [
          { id: 'old', serviceDate: '2026-01-01', serviceType: 'Oil change' },
          { id: 'new', serviceDate: '2026-03-01', serviceType: 'Inspection', archived: true },
          { id: 'current', serviceDate: '2026-02-01', serviceType: 'Tire repair' },
        ],
      }),
    ).toBe('2026-02-01 · Tire repair');
  });

  it('finds the first stop not reached yet', () => {
    expect(nextStop(route, trip())?.id).toBe('a');
    expect(nextStop(route, trip({ stopArrivals: { a: 1 } }))?.id).toBe('b');
    expect(nextStop(route, trip({ stopArrivals: { a: 1, b: 1, s: 1 } }))).toBeNull();
  });

  it('compares an arrival with the planned stop time', () => {
    expect(stopMinutesLate(route.stops[0], 'am', at(7, 20))).toBe(5);
    expect(stopMinutesLate(route.stops[0], 'am', at(7, 12))).toBe(-3);
    expect(stopMinutesLate(route.stops[0], 'am', null)).toBeNull();
  });

  it('uses the school time zone for stop times', () => {
    const arrival = Date.UTC(2026, 8, 23, 12, 20);
    expect(stopMinutesLate(route.stops[0], 'am', arrival, 'America/Chicago')).toBe(5);
  });

  it('does not call an update on time without a fresh bus location', () => {
    const message = familyUpdateMessage(route, trip(), at(7, 20), 'America/Chicago');
    expect(message).toContain('location is not available');
    expect(message).not.toContain('on time');
  });

  it('ignores an old delay report in the ready-made family message', () => {
    const message = familyUpdateMessage(route, trip({
      location: { lat: 40.72, lng: -74.32, at: at(7, 20) },
      alerts: [{ id: 'old-delay', kind: 'delay', minutes: 30, at: at(5, 0) }],
    }), at(7, 20));
    expect(message).not.toContain('30 minutes late');
  });

  it('measures distance in metres', () => {
    // One thousandth of a degree of latitude is about 111 m.
    expect(Math.round(distanceMeters({ lat: 40, lng: -74 }, { lat: 40.001, lng: -74 }))).toBe(111);
  });

  it('says how late a bus is against the next planned stop', () => {
    const onStop = { lat: 40.72, lng: -74.32, at: at(7, 9) };
    expect(minutesLate(route, trip({ location: onStop }), at(7, 10))).toBe(0);
    expect(minutesLate(route, trip({ location: { ...onStop, at: at(7, 21) } }), at(7, 24))).toBe(10);
  });

  it('does not call a run late without a fresh location', () => {
    expect(minutesLate(route, trip(), at(7, 30))).toBeNull();
    expect(minutesLate(route, trip({ location: { lat: 40.72, lng: -74.32, at: at(7, 0) } }), at(7, 30))).toBeNull();
    expect(isFreshLocation({ at: at(7, 40) }, at(7, 30))).toBe(false);
    expect(minutesLate(route, trip({ location: { lat: 40.72, lng: -74.32, at: at(7, 40) } }), at(7, 30))).toBeNull();
  });

  it('marks only old runs without a fresh update for Office review', () => {
    expect(isAbandonedRunCandidate({ status: 'active', startedAt: at(7, 0), location: null }, at(7, 29))).toBe(false);
    expect(isAbandonedRunCandidate({ status: 'active', startedAt: at(7, 0), location: null }, at(7, 30))).toBe(true);
    expect(isAbandonedRunCandidate({ status: 'active', startedAt: at(7, 0), location: { lat: 40.72, lng: -74.32, at: at(7, 29) } }, at(7, 30))).toBe(false);
    expect(isAbandonedRunCandidate({ status: 'done', startedAt: at(7, 0), location: null }, at(7, 30))).toBe(false);
  });

  it('creates a safe phone status message without exposing coordinates', () => {
    const status = transportPhoneStatusText(route, trip({ location: { lat: 40.719, lng: -74.319, at: at(7, 15) } }), at(7, 16));
    expect(status.status).toBe('on_way');
    expect(status.text).toContain('Oak');
    expect(status.text).not.toContain('40.719');
    expect(transportPhoneStatusText(route, null).status).toBe('not_started');
  });

  it('marks a phone status unavailable when the bus update is old', () => {
    const status = transportPhoneStatusText(route, trip({ location: { lat: 40.719, lng: -74.319, at: at(7, 0) } }), at(7, 10));
    expect(status.status).toBe('unavailable');
    expect(status.text).toContain('temporarily unavailable');
  });

  it('warns about riders never marked off and stale locations', () => {
    const names = new Map([['kid1', 'Maya Lopez']]);
    const done = tripWarnings([route], [trip({ status: 'done', riders: { kid1: { status: 'on', at: 1 } } })], names, at(8, 0));
    expect(done[0]).toMatchObject({ tone: 'danger' });
    expect(done[0].text).toContain('Maya Lopez');

    const stale = tripWarnings([route], [trip({ location: { lat: 40.72, lng: -74.32, at: at(7, 0) } })], names, at(7, 10));
    expect(stale.some((w) => w.id === 't1-stale')).toBe(true);
  });

  it('surfaces temporary route exceptions for Office review', () => {
    const names = new Map<string, string>();
    const exception = {
      id: 'exception-1',
      tripId: 't1',
      routeId: 'r1',
      kind: 'detour' as const,
      stopId: 'a',
      status: 'open' as const,
      createdAt: at(7, 5),
      createdBy: 'office',
      expiresAt: at(9, 5),
    };
    const warnings = tripWarnings([route], [trip({ exceptions: { 'exception-1': exception } })], names, at(7, 10));
    expect(warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 't1-exception-1', tone: 'caution' }),
    ]));
    expect(warnings.find((warning) => warning.id === 't1-exception-1')?.text).toContain('Oak');
  });

  it('warns when a new run has a rider release still missing', () => {
    const names = new Map([['kid1', 'Maya Lopez']]);
    const newTrip = trip({
      riderManifest: [{ studentId: 'kid1', displayName: 'Maya Lopez', familyId: 'f1', busStopId: 'a' }],
      riders: { kid1: { status: 'off', at: at(7, 30) } },
    });
    expect(tripWarnings([{ ...route, requireReleaseConfirmations: true }], [newTrip], names, at(7, 35)).some((warning) => warning.id === 't1-release')).toBe(true);
  });

  it('does not warn about releases when the saved route does not require them', () => {
    const names = new Map([['kid1', 'Maya Lopez']]);
    const newTrip = trip({
      riderManifest: [{ studentId: 'kid1', displayName: 'Maya Lopez', familyId: 'f1', busStopId: 'a' }],
      riders: { kid1: { status: 'off', at: at(7, 30) } },
    });
    expect(tripWarnings([route], [newTrip], names, at(7, 35)).some((warning) => warning.id === 't1-release')).toBe(false);
  });

  it('keeps the afternoon school as the first boarding step until the driver confirms it', () => {
    expect(nextStop(route, trip({ run: 'pm' }))?.id).toBe('s');
  });

  it('warns about a missed stop only from a fresh trusted tracker update', () => {
    const trusted = trip({
      location: { lat: 40.72, lng: -74.32, at: at(7, 27), source: 'gps_device' },
      locationSource: 'gps_device',
    });
    expect(gpsMissedStopWarning(route, trusted, at(7, 30))?.id).toBe('t1-gps-missed');
    expect(gpsMissedStopWarning(route, trusted, at(7, 16))).toBeNull();
    expect(gpsMissedStopWarning(route, trip({ ...trusted, location: { ...trusted.location!, at: at(7, 0) } }), at(7, 30))).toBeNull();
    expect(gpsMissedStopWarning(route, trip({ ...trusted, locationSource: 'browser', location: { ...trusted.location!, source: 'browser' } }), at(7, 30))).toBeNull();
    expect(gpsMissedStopWarning(route, { ...trusted, id: 'practice-1' }, at(7, 30))).toBeNull();
  });

  it('finds riders who are off without a release record', () => {
    const recorded = trip({
      riderSnapshot: ['kid1', 'kid2', 'kid3'],
      riders: { kid1: { status: 'off', at: 1 }, kid2: { status: 'off', at: 2 }, kid3: { status: 'absent', at: 3 } },
      releases: { kid1: { studentId: 'kid1', contactName: 'Mom', method: 'authorized_contact', occurredAt: 4, by: 'driver' } },
    });
    expect(missingReleaseStudentIds(recorded)).toEqual(['kid2']);
  });

  it('moves a practice bus along the stops', () => {
    const pts = route.stops;
    expect(pointAlongStops(pts, 0)).toMatchObject({ lat: pts[0].lat, lng: pts[0].lng });
    const end = pointAlongStops(pts, 1);
    expect(end.lat).toBeCloseTo(pts[2].lat);
    expect(end.lng).toBeCloseTo(pts[2].lng);
  });

  it('builds example routes that end at the school', () => {
    const routes = exampleRoutes({ lat: 40.7, lng: -74.3 });
    expect(routes).toHaveLength(3);
    for (const r of routes) {
      expect(r.stops[r.stops.length - 1]).toMatchObject({ isSchool: true, lat: 40.7, lng: -74.3 });
    }
  });

  it('keeps an active trip ahead of older completed attempts', () => {
    const oldDone = trip({ id: 'old', status: 'done', startedAt: at(6, 0) });
    const newDone = trip({ id: 'new', status: 'done', startedAt: at(7, 0) });
    const active = trip({ id: 'active', startedAt: at(8, 0) });
    expect(latestTripForRoute([oldDone, newDone, active], 'r1', 'am')?.id).toBe('active');
    expect(latestTripForRoute([oldDone, newDone], 'r1', 'am')?.id).toBe('new');
  });

  it('keeps the actual student document ids in a new rider snapshot', () => {
    expect(
      riderSnapshotFromStudents([
        { id: 's2', transportMode: 'bus', status: 'active' },
        { id: 's1', transportMode: 'bus', status: undefined },
        { id: 's3', transportMode: 'bus', status: 'withdrawn' },
        { id: 's4', transportMode: 'car', status: 'active' },
        { id: 's5', transportMode: 'bus', status: 'active', archived: true },
      ]),
    ).toEqual(['s1', 's2']);
  });

  it('captures the rider names and stops that the driver saw', () => {
    const manifest = riderManifestFromStudents([
      { id: 's2', firstName: 'Maya', lastName: 'Lopez', nickname: 'May', familyId: 'f2', busStopId: 'stop-a', transportMode: 'bus', status: 'active' },
      { id: 's1', firstName: 'Noah', lastName: 'Cohen', familyId: null, busStopId: 'stop-b', transportMode: 'bus', status: undefined },
      { id: 's3', firstName: 'Old', lastName: 'Record', transportMode: 'bus', status: 'withdrawn' },
    ]);
    expect(manifest).toEqual([
      { studentId: 's2', displayName: 'May Lopez', familyId: 'f2', busStopId: 'stop-a' },
      { studentId: 's1', displayName: 'Noah Cohen', familyId: null, busStopId: 'stop-b' },
    ]);
    expect(riderNameForTrip({ ...trip(), riderManifest: manifest }, 's2', new Map())).toBe('May Lopez');
  });

  it('deduplicates family email addresses for a route update', () => {
    const families = new Map([
      ['f1', { id: 'f1', displayName: 'Lopez family', contacts: [
        { id: 'c1', name: 'Mom', role: 'parent' as const, email: 'MOM@example.com' },
        { id: 'c2', name: 'Dad', role: 'parent' as const, email: 'dad@example.com' },
      ], updatedAt: 1 }],
      ['f2', { id: 'f2', displayName: 'Cohen family', contacts: [
        { id: 'c3', name: 'Guardian', role: 'guardian' as const, email: 'mom@example.com' },
        { id: 'c4', name: 'No email', role: 'other' as const, email: 'off@example.com', transportNotificationsEnabled: false },
      ], updatedAt: 1 }],
    ]);
    const students = [
      { id: 's1', firstName: 'Maya', lastName: 'Lopez', familyId: 'f1', transportMode: 'bus' as const, busRouteId: 'r1', status: 'active' as const, updatedAt: 1 },
      { id: 's2', firstName: 'Noah', lastName: 'Cohen', familyId: 'f2', transportMode: 'bus' as const, busRouteId: 'r1', status: 'active' as const, updatedAt: 1 },
      { id: 's3', firstName: 'Other', lastName: 'Route', familyId: 'f1', transportMode: 'bus' as const, busRouteId: 'r2', status: 'active' as const, updatedAt: 1 },
    ];
    expect(transportFamilyEmails(students, families, 'r1')).toEqual(['dad@example.com', 'mom@example.com']);
    expect(transportFamilyEmails(students, families, 'r1', { riderSnapshot: [], riderManifest: [] })).toEqual([]);
  });

  it('keeps route safety choices for the active trip view', () => {
    expect(routeForTrip({ ...route, notifyFamiliesOnAlert: true, requireReleaseConfirmations: true }, trip())).toMatchObject({ notifyFamiliesOnAlert: true, requireReleaseConfirmations: true });
  });

  it('keeps the release rule from the route saved with the run', () => {
    const savedRoute = { ...route, requireReleaseConfirmations: true, notifyFamiliesOnArrival: true };
    const historical = trip({ routeSnapshot: routeSnapshotForRun(savedRoute) });
    expect(routeForTrip({ ...route, requireReleaseConfirmations: false, notifyFamiliesOnArrival: false }, historical)).toMatchObject({
      requireReleaseConfirmations: true,
      notifyFamiliesOnArrival: true,
    });
  });

  it('uses the route saved with a trip for past history', () => {
    const oldSnapshot = {
      name: 'Old North',
      busNumber: '4',
      color: '#123456',
      stops: [{ id: 'old-stop', name: 'Old stop', lat: 40.7, lng: -74.3 }],
    };
    const historical = routeForTrip(undefined, trip({ routeSnapshot: oldSnapshot }));
    expect(historical).toMatchObject({ id: 'r1', name: 'Old North', stops: oldSnapshot.stops });
  });

  it('summarizes a day without changing the trip records', () => {
    const finished = trip({
      id: 'finished',
      status: 'done',
      startedAt: at(7, 0),
      endedAt: at(7, 45),
      riders: { kid1: { status: 'off', at: at(7, 40) }, kid2: { status: 'absent', at: at(7, 10) } },
      alerts: [{ id: 'a1', kind: 'delay', minutes: 8, at: at(7, 20) }],
    });
    const active = trip({
      id: 'active',
      startedAt: at(8, 0),
      location: { lat: 40.72, lng: -74.32, at: at(8, 10) },
    });
    const summary = transportDaySummary([finished, active], [route], at(8, 10));
    expect(summary).toEqual({
      totalRuns: 2,
      completedRuns: 1,
      activeRuns: 1,
      riderRides: 1,
      alertCount: 1,
      averageMinutes: 45,
      lateRuns: 1,
    });
    expect(transportDaySummaryText('2026-09-23', summary)).toContain('Transportation report — 2026-09-23');
  });
});
