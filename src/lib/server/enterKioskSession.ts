import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';
import { PASSCODE_SECRET_IDS } from '@/lib/passcodeSecrets';
import { schoolPasscodeConfigured } from '@/lib/server/passcodeCredential';
import {
  verifySchoolAccessServer,
  VerifySchoolAccessError,
} from '@/lib/server/verifySchoolAccess';

export class EnterKioskSessionError extends Error {
  constructor(
    readonly code: 'not-found' | 'invalid-argument' | 'permission-denied' | 'failed-precondition',
    message: string,
  ) {
    super(message);
    this.name = 'EnterKioskSessionError';
  }
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function schoolAccessPasscodeFrom(data: Record<string, unknown>): string {
  return trimmedString(data.schoolAccessPasscode) || trimmedString(data.passcode) || '';
}

async function schoolEntryCodeIsRequired(db: Firestore, schoolId: string): Promise<boolean> {
  const secretSnap = await db.collection('schools').doc(schoolId).collection('secrets').doc('entry').get();
  const code = secretSnap.exists ? String(secretSnap.data()?.code ?? '').trim() : '';
  return code.length > 0;
}

async function schoolAccessPasscodeIsRequired(db: Firestore, schoolId: string): Promise<boolean> {
  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  if (!schoolSnap.exists) return false;
  const legacy = schoolAccessPasscodeFrom((schoolSnap.data() ?? {}) as Record<string, unknown>);
  return schoolPasscodeConfigured(db, schoolId, PASSCODE_SECRET_IDS.schoolAccess, legacy);
}

async function hasAnonymousPortalSession(db: Firestore, schoolId: string, uid: string): Promise<boolean> {
  const snap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('anonymousPortalSessions')
    .doc(uid)
    .get();
  return snap.exists;
}

async function ensureAnonymousPortalSession(db: Firestore, schoolId: string, uid: string): Promise<void> {
  await db
    .collection('schools')
    .doc(schoolId)
    .collection('anonymousPortalSessions')
    .doc(uid)
    .set({ grantedAt: FieldValue.serverTimestamp() }, { merge: true });
}

async function ensureKioskMember(db: Firestore, schoolId: string, uid: string): Promise<void> {
  await db
    .collection('schools')
    .doc(schoolId)
    .collection('kioskMembers')
    .doc(uid)
    .set({ createdAt: Date.now(), source: 'student-login' }, { merge: true });
}

/** Server-side kiosk registration (mirrors `enterSchoolKioskSession` Cloud Function). */
export async function enterKioskSessionServer(
  db: Firestore,
  args: {
    uid: string;
    email: string;
    firebase: Record<string, unknown> | undefined;
    schoolId: string;
    passcode?: string;
  },
): Promise<void> {
  const schoolId = args.schoolId.trim().toLowerCase();
  const passcode = trimmedString(args.passcode);

  const publicSnap = await db.collection('schoolPublic').doc(schoolId).get();
  if (!publicSnap.exists) {
    throw new EnterKioskSessionError(
      'permission-denied',
      'Public student access is not enabled for this school.',
    );
  }
  if (publicSnap.data()?.active === false) {
    throw new EnterKioskSessionError('permission-denied', 'School is not active.');
  }
  if (await schoolEntryCodeIsRequired(db, schoolId)) {
    throw new EnterKioskSessionError('permission-denied', 'School entry required.');
  }

  const sampleSchool = isPublicSampleSchoolId(schoolId);
  const hasPortalSession = await hasAnonymousPortalSession(db, schoolId, args.uid);

  if (!sampleSchool && !hasPortalSession) {
    const passcodeRequired = await schoolAccessPasscodeIsRequired(db, schoolId);
    if (passcodeRequired) {
      if (!passcode) {
        throw new EnterKioskSessionError('permission-denied', 'School passcode required.');
      }
      try {
        await verifySchoolAccessServer(db, {
          uid: args.uid,
          email: args.email,
          firebase: args.firebase,
          schoolId,
          passcode,
        });
      } catch (e) {
        if (e instanceof VerifySchoolAccessError) {
          throw new EnterKioskSessionError(e.code, e.message);
        }
        throw e;
      }
    }
  }

  await ensureAnonymousPortalSession(db, schoolId, args.uid);
  await ensureKioskMember(db, schoolId, args.uid);
}
