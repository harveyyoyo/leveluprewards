// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { queueOfficeArrivalNotifications } from './officeArrivalNotifications';
import { officeArrivalEventId } from './officeArrivalEvent';
import type { OfficeBusRoute, OfficeBusStop } from '@/lib/office/types';

function makeDb(accesses: Record<string, unknown>[], families: Record<string, unknown>) {
  const writes: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];
  const stored = new Set<string>();
  const familyRefs = new Map<string, string>();
  const db = {
    collection(name: string) {
      if (name === 'schools') {
        return {
          doc(id: string) {
            return {
              collection(child: string) {
                if (child === 'officeTransportParentAccess') return { limit: () => ({ get: async () => ({ docs: accesses.map((data, index) => ({ id: `access-${index}`, data: () => data })) }) }) };
                if (child === 'officeFamilies') return { doc: (familyId: string) => { familyRefs.set(familyId, familyId); return { familyId }; } };
                return {};
              },
              get: async () => ({ data: () => ({ name: 'Test School' }) }),
            };
          },
        };
      }
      return { doc: (id: string) => ({ collection: name, id, set: (data: Record<string, unknown>) => {
        const key = `${name}|${id}`;
        if (!stored.has(key)) {
          stored.add(key);
          writes.push({ collection: name, id, data });
        }
      } }) };
    },
    getAll: async (...refs: Array<{ familyId: string }>) => refs.map((ref) => ({ id: ref.familyId, exists: true, data: () => families[ref.familyId] })),
    runTransaction: async (callback: (transaction: { getAll: (...refs: Array<{ collection: string; id: string }>) => Promise<Array<{ exists: boolean }>>; create: (ref: { collection: string; id: string }, data: Record<string, unknown>) => void }) => Promise<void>) => callback({
      getAll: async (...refs: Array<{ collection: string; id: string }>) => refs.map((ref) => ({ exists: stored.has(`${ref.collection}|${ref.id}`) })),
      create: (ref: { collection: string; id: string }, data: Record<string, unknown>) => {
        const key = `${ref.collection}|${ref.id}`;
        if (!stored.has(key)) {
          stored.add(key);
          writes.push({ collection: ref.collection, id: ref.id, data });
        }
      },
    }),
    batch: () => ({ set: (ref: { collection: string; id: string }, data: Record<string, unknown>) => {
      const key = `${ref.collection}|${ref.id}`;
      if (!stored.has(key)) {
        stored.add(key);
        writes.push({ collection: ref.collection, id: ref.id, data });
      }
    }, commit: async () => undefined }),
  };
  return { db: db as unknown as Firestore, writes };
}

const route = {
  id: 'route-1', name: 'North', busNumber: '4', color: '#000000', stops: [], updatedAt: 1,
  notifyFamiliesOnArrival: true,
} as OfficeBusRoute;
const stop: OfficeBusStop = { id: 'stop-1', name: 'Oak Street', address: null, lat: 1, lng: 1, amTime: null, pmTime: null };

describe('office arrival notification queue', () => {
  it('uses one stable event id for a stop on a run', () => {
    expect(officeArrivalEventId('school', 'trip', 'stop')).toBe(officeArrivalEventId('school', 'trip', 'stop'));
    expect(officeArrivalEventId('school', 'trip', 'stop')).not.toBe(officeArrivalEventId('school', 'trip', 'other-stop'));
  });

  it('keeps each family channel choice separate and deduplicates the event', async () => {
    const now = Date.now();
    const { db, writes } = makeDb([
      { familyId: 'family-1', status: 'active', expiresAt: now + 60_000, arrivalPreferences: { email: true, sms: true, whatsapp: false, updatedAt: now } },
      { familyId: 'family-2', status: 'active', expiresAt: now + 60_000, arrivalPreferences: { email: false, sms: false, whatsapp: true, updatedAt: now } },
      { familyId: 'family-3', status: 'active', expiresAt: now + 60_000, arrivalPreferences: { email: true, sms: true, whatsapp: true, updatedAt: now } },
      { familyId: 'family-4', status: 'active', expiresAt: now + 60_000, arrivalPreferences: { email: true, sms: true, whatsapp: true, updatedAt: now } },
    ], {
      'family-1': { displayName: 'Family One', contacts: [{ id: 'c1', name: 'Parent', email: 'parent@example.com', phone: '+15550000001', isPrimary: true, transportNotificationsEnabled: true }, { id: 'c1b', name: 'Another contact', email: 'other@example.com', phone: '+15550000009', isPrimary: true, transportNotificationsEnabled: true }] },
      'family-2': { displayName: 'Family Two', contacts: [{ id: 'c2', name: 'Parent', phone: '+15550000002', transportNotificationsEnabled: true }] },
      'family-3': { displayName: 'Family Three', contacts: [{ id: 'c3', name: 'Parent', email: 'other-stop@example.com', phone: '+15550000003', transportNotificationsEnabled: true }] },
      'family-4': { displayName: 'Family Four', contacts: [{ id: 'c4', name: 'Parent', email: 'no-primary@example.com', transportNotificationsEnabled: true }, { id: 'c4b', name: 'Other', email: 'no-primary-2@example.com', transportNotificationsEnabled: true }] },
    });
    const result = await queueOfficeArrivalNotifications({
      db,
      schoolId: 'school',
      eventId: 'arrival-1',
      tripId: 'trip-1',
      route,
      stop,
      receivedAt: now,
      riderManifest: [
        { studentId: 's1', displayName: 'One', familyId: 'family-1', busStopId: stop.id },
        { studentId: 's2', displayName: 'Two', familyId: 'family-2', busStopId: stop.id },
        { studentId: 's3', displayName: 'Other stop', familyId: 'family-3', busStopId: 'another-stop' },
        { studentId: 's4', displayName: 'No primary', familyId: 'family-4', busStopId: stop.id },
      ],
    });
    expect(result.status).toBe('queued');
    expect(result.queued).toBe(3);
    expect(writes.filter((write) => write.collection === 'mail')).toHaveLength(1);
    expect(writes.filter((write) => write.collection === 'sms')).toHaveLength(1);
    expect(writes.filter((write) => write.collection === 'whatsapp')).toHaveLength(1);
    expect(writes.find((write) => write.collection === 'sms')?.data.to).toBe('+15550000001');
    expect(writes.find((write) => write.collection === 'whatsapp')?.data.to).toBe('+15550000002');
    const retry = await queueOfficeArrivalNotifications({
      db,
      schoolId: 'school',
      eventId: 'arrival-1',
      tripId: 'trip-1',
      route,
      stop,
      receivedAt: now,
      riderManifest: [
        { studentId: 's1', displayName: 'One', familyId: 'family-1', busStopId: stop.id },
        { studentId: 's2', displayName: 'Two', familyId: 'family-2', busStopId: stop.id },
      ],
    });
    expect(retry.queued).toBe(0);
    expect(retry.alreadyQueued).toBe(3);
    expect(writes).toHaveLength(3);
  });

  it('does nothing when the route setting is off', async () => {
    const { db, writes } = makeDb([], {});
    const result = await queueOfficeArrivalNotifications({
      db,
      schoolId: 'school',
      eventId: 'arrival-2',
      tripId: 'trip-2',
      route: { ...route, notifyFamiliesOnArrival: false },
      stop,
      receivedAt: Date.now(),
      riderManifest: [],
    });
    expect(result).toEqual({ queued: 0, status: 'not_configured' });
    expect(writes).toHaveLength(0);
  });
});
