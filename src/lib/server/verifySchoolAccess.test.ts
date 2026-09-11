import { describe, expect, it, vi } from 'vitest';
import { buildPasscodeSecretDoc } from '@/lib/passcodeSecrets';
import { verifySchoolAccessServer, VerifySchoolAccessError } from './verifySchoolAccess';

function mockDb(options: {
  schoolExists?: boolean;
  schoolData?: Record<string, unknown>;
  secret?: { salt: string; hash: string } | null;
  sessionSet?: ReturnType<typeof vi.fn>;
}) {
  const sessionSet = options.sessionSet ?? vi.fn().mockResolvedValue(undefined);
  const secretGet = vi.fn().mockResolvedValue(
    options.secret
      ? { exists: true, data: () => options.secret }
      : { exists: false, data: () => undefined },
  );

  const schoolGet = vi.fn().mockResolvedValue({
    exists: options.schoolExists !== false,
    data: () => options.schoolData ?? {},
  });

  const collectionForSchool = vi.fn((name: string) => {
    if (name === 'secrets') {
      return { doc: vi.fn().mockReturnValue({ get: secretGet, set: vi.fn() }) };
    }
    if (name === 'anonymousPortalSessions') {
      return {
        doc: vi.fn().mockReturnValue({
          set: sessionSet,
          get: vi.fn().mockResolvedValue({ exists: false }),
        }),
      };
    }
    return { doc: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ exists: false }) }) };
  });

  const schoolDoc = {
    get: schoolGet,
    collection: collectionForSchool,
    update: vi.fn(),
  };

  const db = {
    collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(schoolDoc) }),
  } as any;

  return { db, sessionSet };
}

describe('verifySchoolAccessServer', () => {
  it('returns not-found for a missing school', async () => {
    const { db } = mockDb({ schoolExists: false });
    await expect(
      verifySchoolAccessServer(db, {
        uid: 'user-1',
        email: '',
        firebase: {},
        schoolId: 'no-such-school',
        passcode: '1234',
      }),
    ).rejects.toMatchObject({ name: 'VerifySchoolAccessError', code: 'not-found' });
  });

  it('throws permission-denied for the wrong hashed passcode', async () => {
    const { db, sessionSet } = mockDb({ secret: buildPasscodeSecretDoc('1234') });
    await expect(
      verifySchoolAccessServer(db, {
        uid: 'user-1',
        email: '',
        firebase: {},
        schoolId: 'yeshiva',
        passcode: '9999',
      }),
    ).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'Invalid passcode.',
    } satisfies Partial<VerifySchoolAccessError>);
    expect(sessionSet).not.toHaveBeenCalled();
  });

  it('throws permission-denied for the wrong legacy passcode', async () => {
    const { db } = mockDb({ schoolData: { schoolAccessPasscode: '1234' } });
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
    const { db } = mockDb({ schoolData: {} });
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

  it('writes the portal session after a correct passcode', async () => {
    const { db, sessionSet } = mockDb({ secret: buildPasscodeSecretDoc('1234') });
    await verifySchoolAccessServer(db, {
      uid: 'user-1',
      email: '',
      firebase: {},
      schoolId: 'yeshiva',
      passcode: '1234',
    });
    expect(sessionSet).toHaveBeenCalled();
    const payload = sessionSet.mock.calls[0]?.[0] as { grantedAt?: Date };
    expect(payload.grantedAt).toBeInstanceOf(Date);
  });
});
