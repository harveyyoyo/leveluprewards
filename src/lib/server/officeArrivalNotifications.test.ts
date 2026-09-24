// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { queueOfficeArrivalNotifications } from './officeArrivalNotifications';
import type { OfficeBusRoute, OfficeBusStop } from '@/lib/office/types';

function makeDb(accesses: Record<string, unknown>[], families: Record<string, unknown>) {
  const writes: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];
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
      return { doc: (id: string) => ({ collection: name, id, set: (data: Record<string, unknown>) => writes.push({ collection: name, id, data }) }) };
    },
    getAll: async (...refs: Array<{ familyId: string }>) => refs.map((ref) => ({ id: ref.familyId, exists: true, data: () => families[ref.familyId] })),
    batch: () => ({ set: (ref: { collection: string; id: string }, data: Record<string, unknown>) => writes.push({ collection: ref.collection, id: ref.id, data }), commit: async () => undefined }),
  };
  return { db: db as unknown as Firestore, writes };
}

const route = {
  id: 'route-1', name: 'North', busNumber: '4', color: '#000000', stops: [], updatedAt: 1,
  notifyFamiliesOnArrival: true,
} as OfficeBusRoute;
const stop: OfficeBusStop = { id: 'stop-1', name: 'Oak Street', address: null, lat: 1, lng: 1, amTime: null, pmTime: null };

describe('office arrival notification queue', () => {
  it('keeps each family channel choice separate and deduplicates the event', async () => {
    const now = Date.now();
    const { db, writes } = makeDb([
      { familyId: 'family-1', status: 'active', expiresAt: now + 60_000, arrivalPreferences: { email: true, sms: true, whatsapp: false, updatedAt: now } },
      { familyId: 'family-2', status: 'active', expiresAt: now + 60_000, arrivalPreferences: { email: false, sms: false, whatsapp: true, updatedAt: now } },
    ], {
      'family-1': { displayName: 'Family One', contacts: [{ id: 'c1', name: 'Parent', email: 'parent@example.com', phone: '+15550000001', isPrimary: true, transportNotificationsEnabled: true }, { id: 'c1b', name: 'Another contact', email: 'other@example.com', phone: '+15550000009', transportNotificationsEnabled: true }] },
      'family-2': { displayName: 'Family Two', contacts: [{ id: 'c2', name: 'Parent', phone: '+15550000002', transportNotificationsEnabled: true }] },
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
        { studentId: 's1', displayName: 'One', familyId: 'family-1' },
        { studentId: 's2', displayName: 'Two', familyId: 'family-2' },
      ],
    });
    expect(result.status).toBe('queued');
    expect(result.queued).toBe(3);
    expect(writes.filter((write) => write.collection === 'mail')).toHaveLength(1);
    expect(writes.filter((write) => write.collection === 'sms')).toHaveLength(1);
    expect(writes.filter((write) => write.collection === 'whatsapp')).toHaveLength(1);
    expect(writes.find((write) => write.collection === 'sms')?.data.to).toBe('+15550000001');
    expect(writes.find((write) => write.collection === 'whatsapp')?.data.to).toBe('+15550000002');
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
