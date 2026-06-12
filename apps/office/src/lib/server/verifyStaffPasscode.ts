import type { Firestore } from 'firebase-admin/firestore';
import { staffPasscodeSecretId } from '@/lib/passcodeSecrets';
import { verifyPasscodeCredential } from '@/lib/server/passcodeCredential';

export const STAFF_LOGIN_ROLES = ['secretary', 'prizeClerk', 'reports', 'librarian', 'office', 'houseCoordinator'] as const;
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
    case 'houseCoordinator':
      return 'roles_houseCoordinator';
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
  let accountsSnap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('staffAccounts')
    .where('username', '==', username.trim().toLowerCase())
    .limit(5)
    .get();

  // Robust fallback: If query returns empty, fetch all staff accounts and match case-and-whitespace insensitively.
  // This is completely safe since schools typically have under 10 desk staff accounts.
  if (accountsSnap.empty) {
    const allAccountsSnap = await db
      .collection('schools')
      .doc(schoolId)
      .collection('staffAccounts')
      .get();

    const matchedDocs = allAccountsSnap.docs.filter((d) => {
      const u = String(d.data()?.username || '').trim().toLowerCase();
      return u === username.trim().toLowerCase();
    });

    if (matchedDocs.length > 0) {
      accountsSnap = {
        docs: matchedDocs,
        empty: false,
        size: matchedDocs.length,
      } as any;
    }
  }

  let match: (typeof accountsSnap.docs)[number] | undefined;
  for (const docSnap of accountsSnap.docs) {
    const row = docSnap.data() as { passcode?: string; role?: string; roles?: string[] };
    const roles = Array.isArray(row.roles) && row.roles.length > 0 ? row.roles : [row.role];
    if (!roles.includes(role)) continue;

    const legacyPasscode =
      row.passcode !== undefined && row.passcode !== null ? String(row.passcode).trim() : '';
    const ok = await verifyPasscodeCredential(
      db,
      schoolId,
      staffPasscodeSecretId(docSnap.id),
      passcode,
      legacyPasscode,
      { kind: 'staff', staffAccountId: docSnap.id },
    );
    if (ok) {
      match = docSnap;
      break;
    }
  }

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
