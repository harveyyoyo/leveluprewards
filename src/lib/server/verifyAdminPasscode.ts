import type { Firestore } from 'firebase-admin/firestore';
import { getDeveloperGoogleEmailAllowlist } from '@/lib/developerAccess';
import { isAllowedGoogleEmailOnAllowlist } from '@/lib/google/googleAllowlist';
import { PASSCODE_SECRET_IDS } from '@/lib/passcodeSecrets';
import { verifyPasscodeCredential } from '@/lib/server/passcodeCredential';

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

/** Firestore fallback: check appConfig/developerAllowlist.uids (survives missing env vars). */
async function isDeveloperUid(db: Firestore, uid: string): Promise<boolean> {
  try {
    const snap = await db.collection('appConfig').doc('developerAllowlist').get();
    const list = snap.exists ? (snap.data()?.uids as string[] | undefined) : undefined;
    return Array.isArray(list) && list.includes(uid);
  } catch {
    return false;
  }
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
  // Primary: email allowlist from env var. Fallback: Firestore developer UID list
  // (survives env var misconfiguration / missing deploys).
  const developerCanBypass =
    isAllowedGoogleAdminBypass(args.email, googleAuth) ||
    (googleAuth && (await isDeveloperUid(db, args.uid)));
  // Google/developer bypass applies only when no passcode was submitted (matches client gate).
  const googleAdminBypass = developerCanBypass && passcode.length === 0;

  if (!googleAdminBypass) {
    if (passcode.length === 0) {
      throw new VerifyAdminPasscodeError('invalid-argument', 'A valid passcode is required.');
    }

    const schoolData = (schoolDoc.data() ?? {}) as Record<string, unknown>;
    const legacyExpected = adminPasscodeFrom(schoolData);
    if (
      !(await verifyPasscodeCredential(
        db,
        schoolId,
        PASSCODE_SECRET_IDS.admin,
        passcode,
        legacyExpected,
        { kind: 'school', fields: ['adminPasscode', 'passcode'] },
      ))
    ) {
      if (!legacyExpected) {
        throw new VerifyAdminPasscodeError(
          'failed-precondition',
          'This school has no admin passcode configured. An administrator must set one before login is possible.',
        );
      }
      throw new VerifyAdminPasscodeError('permission-denied', 'Invalid passcode.');
    }
  }

  await adminRoleRef.set({ role: 'admin' });
}

