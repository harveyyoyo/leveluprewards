import { describe, expect, it, vi } from 'vitest';
import { verifyAdminPasscodeServer, VerifyAdminPasscodeError } from './verifyAdminPasscode';

describe('verifyAdminPasscodeServer', () => {
  function createMockDb(options: {
    schoolData?: Record<string, unknown>;
    existingAdmin?: boolean;
  }) {
    const adminSet = vi.fn().mockResolvedValue(undefined);
    const adminGet = vi.fn().mockResolvedValue({
      exists: Boolean(options.existingAdmin),
      data: () => (options.existingAdmin ? { role: 'admin' } : undefined),
    });

    const roleDocRef = {
      get: adminGet,
      set: adminSet,
    };

    const roleCollection = {
      doc: vi.fn().mockReturnValue(roleDocRef),
    };

    const schoolDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: Boolean(options.schoolData),
        data: () => options.schoolData,
      }),
      collection: vi.fn().mockReturnValue(roleCollection),
    };

    const schoolsCollection = {
      doc: vi.fn().mockReturnValue(schoolDocRef),
    };

    const db = {
      collection: vi.fn().mockReturnValue(schoolsCollection),
    } as any;

    return { db, adminSet, adminGet };
  }

  it('verifies the configured admin passcode and grants admin role', async () => {
    const { db, adminSet } = createMockDb({ schoolData: { adminPasscode: '1234' } });

    await verifyAdminPasscodeServer(db, {
      uid: 'uid-test',
      email: '',
      firebase: undefined,
      schoolId: 'schoolabc',
      passcode: '1234',
    });

    expect(adminSet).toHaveBeenCalledWith({ role: 'admin' });
  });

  it('falls back to the legacy school passcode field', async () => {
    const { db, adminSet } = createMockDb({ schoolData: { passcode: '5678' } });

    await verifyAdminPasscodeServer(db, {
      uid: 'uid-test',
      email: '',
      firebase: undefined,
      schoolId: 'schoolabc',
      passcode: '5678',
    });

    expect(adminSet).toHaveBeenCalledWith({ role: 'admin' });
  });

  it('requires a passcode even when an admin role already exists', async () => {
    const { db } = createMockDb({
      schoolData: { adminPasscode: '1234' },
      existingAdmin: true,
    });

    await expect(
      verifyAdminPasscodeServer(db, {
        uid: 'uid-test',
        email: '',
        firebase: undefined,
        schoolId: 'schoolabc',
        passcode: '',
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' } satisfies Partial<VerifyAdminPasscodeError>);
  });

  it('throws not-found for an unknown school', async () => {
    const { db } = createMockDb({});

    await expect(
      verifyAdminPasscodeServer(db, {
        uid: 'uid-test',
        email: '',
        firebase: undefined,
        schoolId: 'missing',
        passcode: '1234',
      }),
    ).rejects.toMatchObject({ code: 'not-found' } satisfies Partial<VerifyAdminPasscodeError>);
  });

  it('throws permission-denied for the wrong passcode', async () => {
    const { db } = createMockDb({ schoolData: { adminPasscode: '1234' } });

    await expect(
      verifyAdminPasscodeServer(db, {
        uid: 'uid-test',
        email: '',
        firebase: undefined,
        schoolId: 'schoolabc',
        passcode: '0000',
      }),
    ).rejects.toMatchObject({ code: 'permission-denied' } satisfies Partial<VerifyAdminPasscodeError>);
  });
});
