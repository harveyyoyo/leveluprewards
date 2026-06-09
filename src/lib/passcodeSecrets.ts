import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const SALT_BYTES = 16;

/** Firestore `schools/{id}/secrets/{docId}` document ids for hashed credentials. */
export const PASSCODE_SECRET_IDS = {
  schoolAccess: 'school_access',
  admin: 'admin',
} as const;

export type PasscodeSecretDoc = {
  salt: string;
  hash: string;
};

export function teacherPasscodeSecretId(teacherId: string): string {
  return `teacher_${teacherId}`;
}

export function staffPasscodeSecretId(staffAccountId: string): string {
  return `staff_${staffAccountId}`;
}

export function generatePasscodeSalt(): string {
  return randomBytes(SALT_BYTES).toString('hex');
}

export function hashPasscode(passcode: string, salt: string): string {
  const normalized = passcode.trim();
  return createHash('sha256').update(`${salt}:${normalized}`, 'utf8').digest('hex');
}

export function buildPasscodeSecretDoc(passcode: string): PasscodeSecretDoc {
  const salt = generatePasscodeSalt();
  return { salt, hash: hashPasscode(passcode, salt) };
}

export function verifyHashedPasscode(
  passcode: string,
  salt: string,
  expectedHash: string,
): boolean {
  if (!salt || !expectedHash) return false;
  try {
    const computed = hashPasscode(passcode, salt);
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Timing-safe plaintext compare (legacy fallback during migration). */
export function safeEqualPlaintext(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
