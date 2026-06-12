import { describe, expect, it, vi } from 'vitest';
import { buildPasscodeSecretDoc } from '@/lib/passcodeSecrets';
import { verifyPasscodeCredential } from './passcodeCredential';

describe('verifyPasscodeCredential', () => {
  it('accepts hashed secrets', async () => {
    const secret = buildPasscodeSecretDoc('1234');
    const secretGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => secret,
    });
    const secretsDoc = vi.fn().mockReturnValue({ get: secretGet });
    const secretsCollection = vi.fn().mockReturnValue({ doc: secretsDoc });
    const schoolDoc = vi.fn().mockReturnValue({ collection: secretsCollection });
    const db = {
      collection: vi.fn().mockReturnValue({ doc: schoolDoc }),
    } as any;

    const result = await verifyPasscodeCredential(db, 'demo', 'school_access', '1234');
    expect(result).toBe(true);
  });

  it('migrates legacy plaintext on success', async () => {
    const secretSet = vi.fn().mockResolvedValue(undefined);
    const secretGet = vi.fn().mockResolvedValue({ exists: false });
    const secretsDoc = vi.fn().mockImplementation((id: string) => ({
      get: secretGet,
      set: secretSet,
      id,
    }));
    const secretsCollection = vi.fn().mockReturnValue({ doc: secretsDoc });
    const schoolUpdate = vi.fn().mockResolvedValue(undefined);
    const schoolDocRef = {
      collection: secretsCollection,
      update: schoolUpdate,
    };
    const db = {
      collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(schoolDocRef) }),
    } as any;

    const ok = await verifyPasscodeCredential(
      db,
      'demo',
      'school_access',
      '1234',
      '1234',
      { kind: 'school', fields: ['schoolAccessPasscode'] },
    );
    expect(ok).toBe(true);
    expect(secretSet).toHaveBeenCalled();
    expect(schoolUpdate).toHaveBeenCalled();
  });
});
