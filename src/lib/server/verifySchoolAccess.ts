import { timingSafeEqual } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { getDeveloperGoogleEmailAllowlist } from '@/lib/developerAccess';
import { isAllowedGoogleEmailOnAllowlist } from '@/lib/google/googleAllowlist';

const APP_CONFIG_GLOBAL = 'global';

const STAFF_ROLES = [
  'admin',
  'teacher',
  'secretary',
  'prizeClerk',
  'reports',
  'librarian',
  'office',
  'houseCoordinator',
] as const;

type StaffRole = (typeof STAFF_ROLES)[number];

const ROLE_COLLECTIONS: Record<StaffRole, string> = {
  admin: 'roles_admin',
  teacher: 'roles_teacher',
  secretary: 'roles_secretary',
  prizeClerk: 'roles_prizeClerk',
  reports: 'roles_reports',
  librarian: 'roles_librarian',
  office: 'roles_office',
  houseCoordinator: 'roles_houseCoordinator',
};

export class VerifySchoolAccessError extends Error {
  constructor(
    readonly code: 'not-found' | 'invalid-argument' | 'permission-denied' | 'failed-precondition',
    message: string,
  ) {
    super(message);
    this.name = 'VerifySchoolAccessError';
  }
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function schoolAccessPasscodeFrom(data: Record<string, unknown>): string {
  return trimmedString(data.schoolAccessPasscode) || trimmedString(data.passcode) || '';
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

async function hasSchoolRole(db: Firestore, schoolId: string, uid: string): Promise<boolean> {
  const snaps = await Promise.all(
    STAFF_ROLES.map((role) =>
      db.collection('schools').doc(schoolId).collection(ROLE_COLLECTIONS[role]).doc(uid).get(),
    ),
  );
  return snaps.some((snap, index) => snap.exists && snap.data()?.role === STAFF_ROLES[index]);
}

async function isDeveloperUid(db: Firestore, uid: string): Promise<boolean> {
  const snap = await db.collection('appConfig').doc(APP_CONFIG_GLOBAL).get();
  const list = snap.exists ? (snap.data()?.developerUids as string[] | undefined) : undefined;
  return Array.isArray(list) && list.includes(uid);
}

async function hasExistingSchoolPortalAccess(
  db: Firestore,
  schoolId: string,
  uid: string,
  email: string,
  googleAuth: boolean,
): Promise<boolean> {
  if (await hasSchoolRole(db, schoolId, uid)) return true;

  const portalSnap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('anonymousPortalSessions')
    .doc(uid)
    .get();
  if (portalSnap.exists) return true;

  if (isAllowedGoogleAdminBypass(email, googleAuth)) return true;

  return isDeveloperUid(db, uid);
}

async function ensureAnonymousPortalSession(
  db: Firestore,
  schoolId: string,
  uid: string,
): Promise<void> {
  await db
    .collection('schools')
    .doc(schoolId)
    .collection('anonymousPortalSessions')
    .doc(uid)
    .set({ grantedAt: FieldValue.serverTimestamp() }, { merge: true });
}

/** Server-side school access gate (mirrors `verifySchoolAccessPasscode` Cloud Function). */
export async function verifySchoolAccessServer(
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

  const schoolDoc = await db.collection('schools').doc(schoolId).get();
  if (!schoolDoc.exists) {
    throw new VerifySchoolAccessError('not-found', 'School not found.');
  }

  if (passcode.length === 0) {
    if (
      googleAuth &&
      (await hasExistingSchoolPortalAccess(db, schoolId, args.uid, args.email, googleAuth))
    ) {
      await ensureAnonymousPortalSession(db, schoolId, args.uid);
      return;
    }
    throw new VerifySchoolAccessError('invalid-argument', 'A valid passcode is required.');
  }

  const expected = schoolAccessPasscodeFrom((schoolDoc.data() ?? {}) as Record<string, unknown>);
  if (!expected) {
    throw new VerifySchoolAccessError(
      'failed-precondition',
      'This school has no access passcode configured. An administrator must set one before sign-in is possible.',
    );
  }
  if (!safeEqual(expected, passcode)) {
    throw new VerifySchoolAccessError('permission-denied', 'Invalid passcode.');
  }

  await ensureAnonymousPortalSession(db, schoolId, args.uid);
}
