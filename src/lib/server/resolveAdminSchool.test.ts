import { describe, expect, it, vi } from 'vitest';
import {
  listAdminSchoolsForGoogleUser,
  resolveAdminSchoolForGoogleUser,
} from './resolveAdminSchool';

function mockDb(schools: Array<{ id: string; data: Record<string, unknown> }>) {
  const whereGet = vi.fn().mockResolvedValue({
    empty: schools.length === 0,
    docs: schools.map((school) => ({
      id: school.id,
      data: () => school.data,
    })),
  });

  const db = {
    collection: vi.fn((name: string) => {
      if (name === 'appConfig') {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
          }),
        };
      }
      return {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ get: whereGet }),
        }),
      };
    }),
  } as any;

  return { db, whereGet };
}

describe('listAdminSchoolsForGoogleUser', () => {
  it('returns schools that list the Google email', async () => {
    const { db } = mockDb([
      { id: 'elisheva', data: { name: 'Elisheva', adminEmails: ['eli7teitelbaum@gmail.com'] } },
      { id: 'other', data: { name: 'Other School', adminEmails: ['eli7teitelbaum@gmail.com'] } },
    ]);

    const schools = await listAdminSchoolsForGoogleUser(db, {
      uid: 'uid-1',
      email: 'eli7teitelbaum@gmail.com',
      firebase: { sign_in_provider: 'google.com' },
    });

    expect(schools).toEqual([
      { id: 'elisheva', name: 'Elisheva' },
      { id: 'other', name: 'Other School' },
    ]);
  });

  it('returns an empty list for non-Google users', async () => {
    const { db } = mockDb([{ id: 'elisheva', data: { name: 'Elisheva' } }]);
    const schools = await listAdminSchoolsForGoogleUser(db, {
      uid: 'uid-1',
      email: 'eli7teitelbaum@gmail.com',
      firebase: { sign_in_provider: 'password' },
    });
    expect(schools).toEqual([]);
  });
});

describe('resolveAdminSchoolForGoogleUser', () => {
  it('returns the only matching school id', async () => {
    const { db } = mockDb([{ id: 'elisheva', data: { name: 'Elisheva' } }]);
    await expect(
      resolveAdminSchoolForGoogleUser(db, {
        uid: 'uid-1',
        email: 'eli7teitelbaum@gmail.com',
        firebase: { sign_in_provider: 'google.com' },
      }),
    ).resolves.toBe('elisheva');
  });

  it('returns null when more than one school matches', async () => {
    const { db } = mockDb([
      { id: 'elisheva', data: { name: 'Elisheva' } },
      { id: 'other', data: { name: 'Other' } },
    ]);
    await expect(
      resolveAdminSchoolForGoogleUser(db, {
        uid: 'uid-1',
        email: 'eli7teitelbaum@gmail.com',
        firebase: { sign_in_provider: 'google.com' },
      }),
    ).resolves.toBeNull();
  });
});
