import type { NextRequest } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import { verifyFirebaseAuthJwt } from '@/lib/auth/verifyFirebaseAuthJwt';
import { FIREBASE_SESSION_COOKIE_NAME } from '@/lib/auth/firebaseSessionCookie';
import {
  getAuthGateSecret,
  SCHOOL_GATE_COOKIE_NAME,
} from '@/lib/auth/schoolGateCookie';
import { verifySchoolGateJwt } from '@/lib/auth/verifySchoolGateJwt';
import { resolveSchoolGateScopes } from '@/lib/server/resolveSchoolGateScopes';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { getDeveloperGoogleEmailAllowlist } from '@/lib/developerAccess';
import { isAllowedGoogleEmailOnAllowlist } from '@/lib/google/googleAllowlist';

export type VerifiedStaffSession = {
  uid: string;
  schoolId: string;
  scopes: Set<string>;
};

const CLASSROOM_AWARD_SCOPES = new Set([
  'dev',
  'admin',
  'teacher',
  'prizeClerk',
]);

const STAFF_ROLE_COLLECTIONS = [
  'roles_admin',
  'roles_teacher',
  'roles_secretary',
  'roles_prizeClerk',
] as const;

async function uidFromFirebaseCookie(token: string): Promise<{ uid: string; email: string } | null> {
  const jwt = await verifyFirebaseAuthJwt(token);
  if (jwt?.sub) return { uid: jwt.sub, email: '' };

  try {
    const auth = await getFirebaseAdminAuth();
    const decoded = await auth.verifySessionCookie(token, true);
    return { uid: decoded.uid, email: String(decoded.email || '') };
  } catch {
    return null;
  }
}

async function hasStaffRoleDoc(db: Firestore, schoolId: string, uid: string): Promise<boolean> {
  const schoolRef = db.collection('schools').doc(schoolId);
  const snaps = await Promise.all(
    STAFF_ROLE_COLLECTIONS.map((col) => schoolRef.collection(col).doc(uid).get()),
  );
  return snaps.some((snap) => snap.exists);
}

function scopesAllowClassroomAward(scopes: Set<string>): boolean {
  return [...scopes].some((s) => CLASSROOM_AWARD_SCOPES.has(s));
}

function isAllowlistedDeveloperEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return isAllowedGoogleEmailOnAllowlist(normalized, getDeveloperGoogleEmailAllowlist());
}

/**
 * Verifies staff may call school-scoped write APIs.
 * Uses HttpOnly session cookie when present; falls back to Firebase ID token from the client (common in local dev).
 */
export async function verifyStaffForSchoolApi(
  req: NextRequest,
  schoolId: string,
  options?: { idToken?: string },
): Promise<VerifiedStaffSession | null> {
  const sid = schoolId.trim().toLowerCase();
  let uid: string | null = null;
  let email = '';

  let bearerToken = options?.idToken?.trim() || '';
  if (!bearerToken) {
    const authHeader = req.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.slice(7).trim();
    }
  }

  const fbRaw = req.cookies.get(FIREBASE_SESSION_COOKIE_NAME)?.value;
  if (fbRaw) {
    const fromCookie = await uidFromFirebaseCookie(fbRaw);
    if (fromCookie) {
      uid = fromCookie.uid;
      email = fromCookie.email;
    }
  }

  if (!uid && bearerToken) {
    const token = bearerToken;
    const jwt = await verifyFirebaseAuthJwt(token);
    if (jwt?.sub) {
      uid = jwt.sub;
      email = jwt.email || email;
    }
    try {
      const auth = await getFirebaseAdminAuth();
      const decoded = await auth.verifyIdToken(token, true);
      uid = decoded.uid;
      email = String(decoded.email || email || '');
    } catch {
      if (!uid) return null;
    }
  }

  if (!uid) return null;

  let scopes = new Set<string>();
  const gateSecret = getAuthGateSecret();
  const gateRaw = req.cookies.get(SCHOOL_GATE_COOKIE_NAME)?.value;
  if (gateSecret && gateRaw) {
    const gate = await verifySchoolGateJwt(gateRaw, gateSecret);
    if (gate && gate.uid === uid && gate.schoolId === sid) {
      scopes = new Set(gate.scopes);
    }
  }

  if (scopes.size === 0) {
    try {
      const resolved = await resolveSchoolGateScopes(uid, sid);
      scopes = new Set(resolved);
    } catch {
      /* Admin SDK unavailable — fall through to role-doc / developer checks */
    }
  }

  if (scopesAllowClassroomAward(scopes)) {
    return { uid, schoolId: sid, scopes };
  }

  if (isAllowlistedDeveloperEmail(email)) {
    scopes.add('dev');
    return { uid, schoolId: sid, scopes };
  }

  try {
    await getFirebaseAdminAuth();
    const admin = (await import('firebase-admin')).default;
    const db = admin.firestore();
    if (await hasStaffRoleDoc(db, sid, uid)) {
      if (!scopes.has('admin')) scopes.add('teacher');
      return { uid, schoolId: sid, scopes };
    }
  } catch {
    return null;
  }

  return null;
}

/** @deprecated Use verifyStaffForSchoolApi */
export async function verifyStaffSessionFromRequest(
  req: NextRequest,
  schoolId: string,
): Promise<VerifiedStaffSession | null> {
  return verifyStaffForSchoolApi(req, schoolId);
}
