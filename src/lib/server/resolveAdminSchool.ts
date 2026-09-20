import type { Firestore } from 'firebase-admin/firestore';
import { getDeveloperGoogleEmailAllowlist } from '@/lib/developerAccess';
import { isAllowedGoogleEmailOnAllowlist } from '@/lib/google/googleAllowlist';

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

/**
 * Find the single school (if any) that lists this Google email as an admin
 * (`schools/{id}.adminEmails`), so the login page can skip "which school?" for
 * everyone except the platform's own developer/owner accounts — they legitimately
 * manage many schools and keep the manual picker.
 */
export async function resolveAdminSchoolForGoogleUser(
  db: Firestore,
  args: { uid: string; email: string; firebase: Record<string, unknown> | undefined },
): Promise<string | null> {
  const googleAuth = isGoogleAuthenticated(args.firebase);
  if (!googleAuth) return null;

  const email = args.email.trim().toLowerCase();
  if (!email) return null;

  // Developers/owners intentionally keep the manual school picker.
  if (isAllowedGoogleAdminBypass(email, googleAuth) || (await isDeveloperUid(db, args.uid))) {
    return null;
  }

  const snap = await db.collection('schools').where('adminEmails', 'array-contains', email).limit(2).get();
  // Zero matches (not registered anywhere) or more than one (ambiguous) — fall back
  // to the manual school picker rather than guessing.
  if (snap.size !== 1) return null;

  return snap.docs[0]!.id;
}
