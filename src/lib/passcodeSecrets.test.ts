import { describe, expect, it } from 'vitest';
import {
  buildPasscodeSecretDoc,
  hashPasscode,
  safeEqualPlaintext,
  verifyHashedPasscode,
} from './passcodeSecrets';

describe('passcodeSecrets', () => {
  it('hashes and verifies passcodes', () => {
    const secret = buildPasscodeSecretDoc('1234');
    expect(verifyHashedPasscode('1234', secret.salt, secret.hash)).toBe(true);
    expect(verifyHashedPasscode('9999', secret.salt, secret.hash)).toBe(false);
    expect(hashPasscode('1234', secret.salt)).toBe(secret.hash);
  });

  it('compares legacy plaintext safely', () => {
    expect(safeEqualPlaintext('abc', 'abc')).toBe(true);
    expect(safeEqualPlaintext('abc', 'abd')).toBe(false);
    expect(safeEqualPlaintext('', 'x')).toBe(false);
  });
});
