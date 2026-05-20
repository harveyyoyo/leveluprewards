import type { Firestore } from 'firebase-admin/firestore';

export const STAFF_LOGIN_ROLES = ['secretary', 'prizeClerk', 'reports', 'librarian', 'office'] as const;
export type StaffLoginRole = (typeof STAFF_LOGIN_ROLES)[number];

export function isStaffLoginRole(value: string): value is StaffLoginRole {
  return (STAFF_LOGIN_ROLES as readonly string[]).includes(value);
}

export function roleCollectionForStaffRole(staffRole: StaffLoginRole): string {
  switch (staffRole) {
    case 'secretary':
      return 'roles_secretary';
    case 'prizeClerk':
      return 'roles_prizeClerk';
    case 'librarian':
      return 'roles_librarian';
    case 'office':
      return 'roles_office';
    default:
      return 'roles_reports';
  }
}

function normalizeRoles(row: { role?: string; roles?: string[] }): StaffLoginRole[] {
  const raw = Array.isArray(row.roles) && row.roles.length > 0 ? row.roles : [row.role];
  return raw.filter((item): item is StaffLoginRole => isStaffLoginRole(String(item)));
}

/** Verify desk-staff username + passcode and grant Firestore role docs (mirrors Cloud Function). */
export async function verifyStaffAccountPasscodeServer(
  db: Firestore,
  uid: string,
  schoolId: string,
  username: string,
  passcode: string,
  role: StaffLoginRole,
): Promise<{ displayName: string; roles: StaffLoginRole[] }> {
  const accountsSnap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('staffAccounts')
    .where('username', '==', username.trim().toLowerCase())
    .limit(5)
    .get();

  const match = accountsSnap.docs.find((d) => {
    const row = d.data() as { passcode?: string; role?: string; roles?: string[] };
    const roles = Array.isArray(row.roles) && row.roles.length > 0 ? row.roles : [row.role];
    return roles.includes(role) && row.passcode === passcode;
  });

  if (!match) {
    throw new Error('INVALID_STAFF_LOGIN');
  }

  const row = match.data() as { displayName?: string; role?: string; roles?: string[] };
  const roles = normalizeRoles(row);
  const writes = roles.map((staffRole) =>
    db
      .collection('schools')
      .doc(schoolId)
      .collection(roleCollectionForStaffRole(staffRole))
      .doc(uid)
      .set({ role: staffRole }),
  );
  await Promise.all(writes);

  const displayName =
    typeof row.displayName === 'string' && row.displayName.trim().length > 0
      ? row.displayName.trim()
      : username;

  return { displayName, roles };
}
