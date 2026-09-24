import { beforeEach, describe, expect, it } from 'vitest';
import { clearDriverOfflinePacket, readDriverOfflinePacket, saveDriverOfflinePacket } from '@/lib/office/officeDriverOffline';
import type { OfficeBusRoute, OfficeBusTrip } from '@/lib/office/types';

const route: OfficeBusRoute = {
  id: 'route-1',
  name: 'North',
  color: '#0f766e',
  stops: [{ id: 'stop-1', name: 'Oak', lat: 40.7, lng: -74.3 }],
  updatedAt: 1,
};

const trip: OfficeBusTrip = {
  id: 'trip-1',
  routeId: route.id,
  date: '2026-09-23',
  run: 'am',
  status: 'active',
  startedAt: 1,
  stopArrivals: {},
  riders: {},
  alerts: [],
  riderManifest: [],
  updatedAt: 1,
};

describe('driver offline packets', () => {
  beforeEach(() => sessionStorage.clear());

  it('saves and reads a read-only trip copy for this tab', () => {
    expect(saveDriverOfflinePacket('school-a', trip, route)).toBe(true);
    expect(readDriverOfflinePacket('school-a')).toMatchObject({ schoolId: 'school-a', trip: { id: 'trip-1' }, route: { id: 'route-1' } });
    expect(readDriverOfflinePacket('school-b')).toBeNull();
    clearDriverOfflinePacket('school-a');
    expect(readDriverOfflinePacket('school-a')).toBeNull();
  });

  it('does not save a finished or malformed trip', () => {
    expect(saveDriverOfflinePacket('school-a', { ...trip, status: 'done' }, route)).toBe(false);
    sessionStorage.setItem('office-driver-offline:school-a', JSON.stringify({ version: 1, savedAt: Date.now(), schoolId: 'school-a', trip: { ...trip, status: 'done' }, route }));
    expect(readDriverOfflinePacket('school-a')).toBeNull();
    sessionStorage.setItem('office-driver-offline:school-a', JSON.stringify({ version: 1, savedAt: Date.now() - 25 * 60 * 60 * 1000, schoolId: 'school-a', trip, route }));
    expect(readDriverOfflinePacket('school-a')).toBeNull();
  });
});
