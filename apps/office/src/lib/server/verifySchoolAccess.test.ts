import { describe, expect, it, vi } from 'vitest';
import { buildPasscodeSecretDoc } from '@/lib/passcodeSecrets';
import { verifySchoolAccessServer, VerifySchoolAccessError } from './verifySchoolAccess';

describe('verifySchoolAccessServer', () => {
  function createMockDb(options: {
    schoolData?: Record<string, unknown>;
    hashedSecret?: { salt: string; hash: string };
  }) {
    const sessionSet = vi.fn().mockResolvedValue(undefined);
    const secretsCollection = {
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue(
          options.hashedSecret
            ? { exists: true, data: () => options.hashedSecret }
            : { exists: false, data: () => undefined },
        ),
        set: vi.fn().mockResolvedValue(undefined),
      }),
    };
    const portalSessionsCollection = {
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: sessionSet,
      }),
    };
    const roleCollection = {
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
      }),
    };

    const schoolDocRef = {
      get: vi.fn().mockResolvedValue({
        exists: Boolean(options.schoolData),
        data: () => options.schoolData,
      }),
      collection: vi.fn((name: string) => {
        if (name === 'secrets') return secretsCollection;
        if (name === 'anonymousPortalSessions') return portalSessionsCollection;
        return roleCollection;
      }),
      update: vi.fn().mockResolvedValue(undefined),
    };

    const db = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(schoolDocRef),
      }),
    } as any;

    return { db, sessionSet };
  }

  it('accepts a hashed school access passcode', async () => {
    const { db, sessionSet } = createMockDb({
      schoolData: {},
      hashedSecret: buildPasscodeSecretDoc('1234'),
    });

    await verifySchoolAccessServer(db, {
      uid: 'uid-test',
      email: '',
      firebase: undefined,
      schoolId: 'schoolabc',
      passcode: '1234',
    });

    expect(sessionSet).toHaveBeenCalled();
  });

  it('throws permission-denied for the wrong hashed passcode', async () => {
    const { db } = createMockDb({
      schoolData: {},
      hashedSecret: buildPasscodeSecretDoc('1234'),
    });

    await expect(
      verifySchoolAccessServer(db, {
        uid: 'uid-test',
        email: '',
        firebase: undefined,
        schoolId: 'schoolabc',
        passcode: '0000',
      }),
    ).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'Invalid passcode.',
    } satisfies Partial<VerifySchoolAccessError>);
  });

  it('throws permission-denied for the wrong legacy passcode', async () => {
    const { db } = createMockDb({ schoolData: { schoolAccessPasscode: '1234' } });

    await expect(
      verifySchoolAccessServer(db, {
        uid: 'uid-test',
        email: '',
        firebase: undefined,
        schoolId: 'schoolabc',
        passcode: '0000',
      }),
    ).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'Invalid passcode.',
    } satisfies Partial<VerifySchoolAccessError>);
  });

  it('throws failed-precondition when no school access passcode is configured', async () => {
    const { db } = createMockDb({ schoolData: {} });

    await expect(
      verifySchoolAccessServer(db, {
        uid: 'uid-test',
        email: '',
        firebase: undefined,
        schoolId: 'schoolabc',
        passcode: '0000',
      }),
    ).rejects.toMatchObject({ code: 'failed-precondition' } satisfies Partial<VerifySchoolAccessError>);
  });
});
