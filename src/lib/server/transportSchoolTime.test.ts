// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { getTransportSchoolTimeZone, transportSchoolTimeZone, transportSchoolToday } from './transportSchoolTime';

function fakeDb(schoolData: Record<string, unknown>, attendanceData: Record<string, unknown>) {
  return {
    collection(name: string) {
      return {
        doc(id: string) {
          return {
            get: async () => ({ data: () => (name === 'schools' ? schoolData : attendanceData) }),
            collection(child: string) {
              return { doc: () => ({ get: async () => ({ data: () => (child === 'attendance' ? attendanceData : undefined) }) }) };
            },
          };
        },
      };
    },
  } as unknown as Firestore;
}

describe('transport school time', () => {
  it('prefers the school attendance time zone', async () => {
    expect(await getTransportSchoolTimeZone(fakeDb({ timezone: 'UTC' }, { attendanceTimeZone: 'America/New_York' }), 'school')).toBe('America/New_York');
  });

  it('falls back to the school record when attendance settings have no time zone', async () => {
    expect(await getTransportSchoolTimeZone(fakeDb({ timezone: 'UTC' }, {}), 'school')).toBe('UTC');
    expect(transportSchoolTimeZone({ appSettings: { attendanceTimeZone: 'Europe/London' } })).toBe('Europe/London');
  });

  it('builds the school calendar date in the chosen time zone', () => {
    const instant = Date.UTC(2026, 8, 24, 2, 30);
    expect(transportSchoolToday(instant, 'America/Los_Angeles')).toBe('2026-09-23');
  });
});
