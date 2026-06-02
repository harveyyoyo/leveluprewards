import { timingSafeEqual } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { getDeveloperGoogleEmailAllowlist } from '@/lib/developerAccess';
import { isAllowedGoogleEmailOnAllowlist } from '@/lib/google/googleAllowlist';

export class VerifyAdminPasscodeError extends Error {
  constructor(
    readonly code: 'not-found' | 'invalid-argument' | 'permission-denied' | 'failed-precondition',
    message: string,
  ) {
    super(message);
    this.name = 'VerifyAdminPasscodeError';
  }
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function adminPasscodeFrom(data: Record<string, unknown>): string {
  return trimmedString(data.adminPasscode) || trimmedString(data.passcode) || '';
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function isGoogleAuthenticated(firebase: Record<string, unknown> | undefined): boolean {
  const provider = String(firebase?.sign_in_provider ?? '');
  if (provider === 'google.com') return true;
  const identities = firebase?.identities as Record<string, unknown> | undefined;
  return Boolean(identities && (identities['google.com'] || identities.google));
}

function isAllowedGoogleAdminBypass(email: string, googleAuth: boolean): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !googleAuth) return false;
  return isAllowedGoogleEmailOnAllowlist(normalized, getDeveloperGoogleEmailAllowlist());
}

/** Server-side admin passcode gate (mirrors `verifySchoolPasscode` Cloud Function). */
export async function verifyAdminPasscodeServer(
  db: Firestore,
  args: {
    uid: string;
    email: string;
    firebase: Record<string, unknown> | undefined;
    schoolId: string;
    passcode: string;
  },
): Promise<void> {
  const schoolId = args.schoolId.trim().toLowerCase();
  const passcode = args.passcode.trim();
  const googleAuth = isGoogleAuthenticated(args.firebase);
  const schoolRef = db.collection('schools').doc(schoolId);
  const schoolDoc = await schoolRef.get();

  if (!schoolDoc.exists) {
    throw new VerifyAdminPasscodeError('not-found', 'School not found.');
  }

  const adminRoleRef = schoolRef.collection('roles_admin').doc(args.uid);
  const googleAdminBypass = isAllowedGoogleAdminBypass(args.email, googleAuth);

  if (!googleAdminBypass) {
    if (passcode.length === 0) {
      const existingAdmin = await adminRoleRef.get();
      if (existingAdmin.exists && existingAdmin.data()?.role === 'admin') {
        return;
      }
      throw new VerifyAdminPasscodeError('invalid-argument', 'A valid passcode is required.');
    }

    const expected = adminPasscodeFrom((schoolDoc.data() ?? {}) as Record<string, unknown>);
    if (!expected) {
      throw new VerifyAdminPasscodeError(
        'failed-precondition',
        'This school has no admin passcode configured. An administrator must set one before login is possible.',
      );
    }
    if (!safeEqual(expected, passcode)) {
      throw new VerifyAdminPasscodeError('permission-denied', 'Invalid passcode.');
    }
  }

  await adminRoleRef.set({ role: 'admin' });
}
