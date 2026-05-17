import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const SALT_BYTES = 16;

export function generatePortalPasscodeSalt(): string {
  return randomBytes(SALT_BYTES).toString('hex');
}

export function hashPortalPasscode(passcode: string, salt: string): string {
  const normalized = passcode.trim();
  return createHash('sha256').update(`${salt}:${normalized}`, 'utf8').digest('hex');
}

export function verifyPortalPasscode(passcode: string, salt: string, expectedHash: string): boolean {
  if (!salt || !expectedHash) return false;
  try {
    const computed = hashPortalPasscode(passcode, salt);
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
