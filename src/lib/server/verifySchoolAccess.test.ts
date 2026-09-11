import { describe, expect, it, vi } from 'vitest';
import { buildPasscodeSecretDoc } from '@/lib/passcodeSecrets';
import { verifySchoolAccessServer, VerifySchoolAccessError } from './verifySchoolAccess';

function mockDb(options: {
  schoolExists?: boolean;
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
    data: () => ({}),
  });

  const collectionForSchool = vi.fn((name: string) => {
    if (name === 'secrets') {
      return { doc: vi.fn().mockReturnValue({ get: secretGet }) };
    }
    if (name === 'anonymousPortalSessions') {
      return { doc: vi.fn().mockReturnValue({ set: sessionSet, get: vi.fn() }) };
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

  it('rejects a wrong passcode without writing a portal session', async () => {
    const { db, sessionSet } = mockDb({ secret: buildPasscodeSecretDoc('1234') });
    await expect(
      verifySchoolAccessServer(db, {
        uid: 'user-1',
        email: '',
        firebase: {},
        schoolId: 'yeshiva',
        passcode: '9999',
      }),
    ).rejects.toBeInstanceOf(VerifySchoolAccessError);
    expect(sessionSet).not.toHaveBeenCalled();
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
