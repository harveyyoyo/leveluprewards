import type { Firestore } from 'firebase-admin/firestore';
import { getDeveloperGoogleEmailAllowlist } from '@/lib/developerAccess';
import { isAllowedGoogleEmailOnAllowlist } from '@/lib/google/googleAllowlist';

export type ResolvedAdminSchool = {
  id: string;
  name: string;
};

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

function schoolDisplayName(id: string, data: Record<string, unknown> | undefined): string {
  const name = typeof data?.name === 'string' ? data.name.trim() : '';
  return name || id;
}

/**
 * List every school that includes this Google email on `schools/{id}.adminEmails`.
 * Platform developer/owner accounts keep the manual school picker (empty list).
 */
export async function listAdminSchoolsForGoogleUser(
  db: Firestore,
  args: { uid: string; email: string; firebase: Record<string, unknown> | undefined },
): Promise<ResolvedAdminSchool[]> {
  const googleAuth = isGoogleAuthenticated(args.firebase);
  if (!googleAuth) return [];

  const email = args.email.trim().toLowerCase();
  if (!email) return [];

  // Developers/owners intentionally keep the manual school picker.
  if (isAllowedGoogleAdminBypass(email, googleAuth) || (await isDeveloperUid(db, args.uid))) {
    return [];
  }

  const snap = await db.collection('schools').where('adminEmails', 'array-contains', email).limit(25).get();
  if (snap.empty) return [];

  return snap.docs
    .map((doc) => ({
      id: doc.id,
      name: schoolDisplayName(doc.id, doc.data() as Record<string, unknown>),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Find the single school (if any) that lists this Google email as an admin.
 * Returns null when zero or more than one school matches.
 */
export async function resolveAdminSchoolForGoogleUser(
  db: Firestore,
  args: { uid: string; email: string; firebase: Record<string, unknown> | undefined },
): Promise<string | null> {
  const schools = await listAdminSchoolsForGoogleUser(db, args);
  if (schools.length !== 1) return null;
  return schools[0]!.id;
}
