import { describe, expect, it, vi } from 'vitest';
import { verifyStaffAccountPasscodeServer } from './verifyStaffPasscode';

describe('verifyStaffAccountPasscodeServer', () => {
  const createMockDb = (docs: any[]) => {
    const queryRes = {
      docs: docs.map(d => ({
        id: d.id || 'id1',
        data: () => d,
      })),
      empty: docs.length === 0,
      size: docs.length,
    };

    const docMock = {
      set: vi.fn().mockResolvedValue(undefined),
    };

    const collectionMock = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(queryRes),
      doc: vi.fn().mockReturnValue(docMock),
    };

    const docRef = {
      collection: vi.fn().mockReturnValue(collectionMock),
    };

    const schoolsCollection = {
      doc: vi.fn().mockReturnValue(docRef),
    };

    const db = {
      collection: vi.fn().mockReturnValue(schoolsCollection),
    } as any;

    return { db };
  };

  it('verifies standard staff account with matching string credentials', async () => {
    const staff = {
      id: 'secretary1',
      username: 'secretary',
      passcode: '1234',
      role: 'secretary',
      roles: ['secretary'],
      displayName: 'Secretary Sally',
    };

    const { db } = createMockDb([staff]);

    const result = await verifyStaffAccountPasscodeServer(
      db,
      'uid-test',
      'school-abc',
      'secretary',
      '1234',
      'secretary',
    );

    expect(result.displayName).toBe('Secretary Sally');
    expect(result.roles).toEqual(['secretary']);
  });

  it('coerces numeric passcode in firestore to string during match', async () => {
    const staff = {
      id: 'clerk1',
      username: 'prize_clerk',
      passcode: 9999 as any, // stored as a number in Firestore
      role: 'prizeClerk',
      roles: ['prizeClerk'],
      displayName: 'Prize Pete',
    };

    const { db } = createMockDb([staff]);

    const result = await verifyStaffAccountPasscodeServer(
      db,
      'uid-test',
      'school-abc',
      'prize_clerk',
      '9999',
      'prizeClerk',
    );

    expect(result.displayName).toBe('Prize Pete');
    expect(result.roles).toEqual(['prizeClerk']);
  });

  it('performs case-and-space-insensitive matching fallback when username has weird formatting', async () => {
    const staffInDb = {
      id: 'sec1',
      username: 'Secretary-One ', // stored with mixed case and trailing space
      passcode: '5678',
      role: 'secretary',
      roles: ['secretary'],
      displayName: 'Sec One',
    };

    // For the fallback behavior, we mock two collection behaviors:
    // First query with exact lowercase 'secretary-one' will return empty
    // Second query (fallback get all) will return fullQueryRes

    const emptyQueryRes = { docs: [], empty: true, size: 0 };
    const fullQueryRes = {
      docs: [{
        id: staffInDb.id,
        data: () => staffInDb,
      }],
      empty: false,
      size: 1,
    };

    const docMock = {
      set: vi.fn().mockResolvedValue(undefined),
    };

    // Chaining mock that shifts from returning empty results for .where() to full results for the fallback .get()
    const collectionMock = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn()
        .mockResolvedValueOnce(emptyQueryRes) // First call: exact match query
        .mockResolvedValueOnce(fullQueryRes), // Second call: get() all fallback
      doc: vi.fn().mockReturnValue(docMock),
    };

    const docRef = {
      collection: vi.fn().mockReturnValue(collectionMock),
    };

    const schoolsCollection = {
      doc: vi.fn().mockReturnValue(docRef),
    };

    const db = {
      collection: vi.fn().mockReturnValue(schoolsCollection),
    } as any;

    const result = await verifyStaffAccountPasscodeServer(
      db,
      'uid-test',
      'school-abc',
      'secretary-one',
      '5678',
      'secretary',
    );

    expect(result.displayName).toBe('Sec One');
    expect(result.roles).toEqual(['secretary']);
  });

  it('throws an error if username/passcode does not match', async () => {
    const { db } = createMockDb([]);

    await expect(
      verifyStaffAccountPasscodeServer(
        db,
        'uid-test',
        'school-abc',
        'nonexistent',
        '1111',
        'secretary',
      ),
    ).rejects.toThrow('INVALID_STAFF_LOGIN');
  });
});
