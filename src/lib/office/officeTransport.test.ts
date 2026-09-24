import { describe, expect, it } from 'vitest';
import {
  distanceMeters,
  exampleRoutes,
  latestMaintenanceLabel,
  latestTripForRoute,
  minutesLate,
  nextStop,
  orderedStops,
  pointAlongStops,
  riderManifestFromStudents,
  riderNameForTrip,
  riderSnapshotFromStudents,
  routeForTrip,
  routeReadiness,
  stopMinutesLate,
  transportDaySummary,
  transportDaySummaryText,
  transportFamilyEmails,
  tripWarnings,
  vehicleDueLabel,
  vehicleLabel,
} from '@/lib/office/officeTransport';
import type { OfficeBusRoute, OfficeBusTrip } from '@/lib/office/types';

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

  it('summarizes vehicle identity and overdue dates', () => {
    const vehicle = { year: 2022, make: 'Ford', model: 'Transit', plate: 'BUS-4', inspectionDue: '2026-01-01' };
    expect(vehicleLabel(vehicle)).toBe('2022 Ford Transit · BUS-4');
    expect(vehicleDueLabel(vehicle, at(2, 0))).toBe('Inspection overdue');
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

  it('measures distance in metres', () => {
    // One thousandth of a degree of latitude is about 111 m.
    expect(Math.round(distanceMeters({ lat: 40, lng: -74 }, { lat: 40.001, lng: -74 }))).toBe(111);
  });

  it('says how late a bus is against the next planned stop', () => {
    const onStop = { lat: 40.72, lng: -74.32, at: at(7, 20) };
    expect(minutesLate(route, trip({ location: onStop }), at(7, 10))).toBe(0);
    expect(minutesLate(route, trip({ location: onStop }), at(7, 24))).toBe(10);
  });

  it('warns about riders never marked off and stale locations', () => {
    const names = new Map([['kid1', 'Maya Lopez']]);
    const done = tripWarnings([route], [trip({ status: 'done', riders: { kid1: { status: 'on', at: 1 } } })], names, at(8, 0));
    expect(done[0]).toMatchObject({ tone: 'danger' });
    expect(done[0].text).toContain('Maya Lopez');

    const stale = tripWarnings([route], [trip({ location: { lat: 40.72, lng: -74.32, at: at(7, 0) } })], names, at(7, 10));
    expect(stale.some((w) => w.id === 't1-stale')).toBe(true);
  });

  it('warns when a new run has a rider release still missing', () => {
    const names = new Map([['kid1', 'Maya Lopez']]);
    const newTrip = trip({
      riderManifest: [{ studentId: 'kid1', displayName: 'Maya Lopez', familyId: 'f1', busStopId: 'a' }],
      riders: { kid1: { status: 'off', at: at(7, 30) } },
    });
    expect(tripWarnings([route], [newTrip], names, at(7, 35)).some((warning) => warning.id === 't1-release')).toBe(true);
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

  it('keeps the route family alert choice for the active trip view', () => {
    expect(routeForTrip({ ...route, notifyFamiliesOnAlert: true }, trip())).toMatchObject({ notifyFamiliesOnAlert: true });
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
