import { resolveSchoolGateScopes } from '@/lib/server/resolveSchoolGateScopes';

/**
 * Whether a Firebase UID may start portal → office handoff (admin, office, or dev).
 * Falls back to Firestore roles when the school-gate cookie is missing or stale.
 */
export async function resolveOfficeHandoffAccess(
  uid: string,
  schoolId: string,
  gateScopes: Set<string> | null | undefined,
): Promise<{ allowed: boolean; loginState: 'admin' | 'office'; userName: string } | null> {
  const scopes = new Set(gateScopes ?? []);
  if (!scopes.has('admin') && !scopes.has('office') && !scopes.has('dev')) {
    const fromDb = await resolveSchoolGateScopes(uid, schoolId);
    for (const s of fromDb) scopes.add(s);
  }

  if (scopes.has('dev') || scopes.has('admin')) {
    return { allowed: true, loginState: 'admin', userName: 'Admin' };
  }
  if (scopes.has('office')) {
    return { allowed: true, loginState: 'office', userName: 'Office staff' };
  }
  return null;
}
