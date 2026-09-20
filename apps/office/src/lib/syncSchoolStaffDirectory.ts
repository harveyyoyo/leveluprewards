import { doc, getDoc, getDocs, setDoc, type Firestore } from 'firebase/firestore';
import type { StaffAccount, StaffAccountRole, Teacher, TeacherPersonnelRole } from '@/lib/types';
import { normalizeTeacherPersonnelRole } from '@/lib/teacherPersonnelRole';
import { staffAccountsCollectionRef } from '@/lib/db/staffAccounts';

/** Public portal sign-in row (stored on `schoolPublic/{schoolId}.staffDirectory`). */
export type StaffPortalLoginOption = {
  id: string;
  sourceId?: string;
  type: 'teacher' | StaffAccountRole;
  label: string;
  username: string;
  /** Principals and division heads sign in as teachers but show a distinct role on the portal. */
  personnelRole?: TeacherPersonnelRole;
  updatedAt?: number;
};

const PORTAL_STAFF_ROLES: StaffAccountRole[] = [
  'secretary',
  'prizeClerk',
  'reports',
  'librarian',
  'office',
  'houseCoordinator',
];

function normalizePortalKeyPart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '');
}

export function teacherPortalKey(teacher: Teacher) {
  const usernameKey = normalizePortalKeyPart(teacher.username || '');
  return `teacher:${usernameKey || teacher.id}`;
}

/** Build the staff directory shown on the school portal (teachers + desk staff, one row per ability). */
export function buildStaffDirectory(
  teachers: Teacher[] | null | undefined,
  staffAccounts: StaffAccount[] | null | undefined,
): StaffPortalLoginOption[] {
  const expected = new Map<string, StaffPortalLoginOption>();
  const now = Date.now();

  for (const teacher of teachers ?? []) {
    const username = (teacher.username || teacher.id).trim();
    const key = teacherPortalKey(teacher);
    if (!teacher.name?.trim() || !username) continue;
    const personnelRole = normalizeTeacherPersonnelRole(teacher.personnelRole);
    const option: StaffPortalLoginOption = {
      id: key,
      sourceId: teacher.id,
      type: 'teacher',
      label: teacher.name.trim(),
      username,
      updatedAt: now,
    };
    // Only include personnelRole for non-default roles (Firestore rejects undefined values)
    if (personnelRole && personnelRole !== 'teacher') {
      option.personnelRole = personnelRole;
    }
    expected.set(key, option);
  }

  for (const account of staffAccounts ?? []) {
    const username = account.username.trim().toLowerCase();
    const label = account.displayName.trim();
    if (!username || !label) continue;

    const accountRoles = account.roles?.length ? account.roles : [account.role];
    const portalRoles = accountRoles.filter((r): r is StaffAccountRole => PORTAL_STAFF_ROLES.includes(r));

    for (const portalRole of portalRoles) {
      const id = `${portalRole}:${account.id}`;
      expected.set(id, {
        id,
        sourceId: account.id,
        type: portalRole,
        label,
        username,
        updatedAt: now,
      });
    }
  }

  return Array.from(expected.values());
}

/**
 * Publish desk staff (and, when provided, teachers) to `schoolPublic` for portal sign-in.
 *
 * Office only ever knows about its own `role: 'office'` staff accounts - it has no
 * access to the Rewards-only teacher roster. Passing an empty/omitted `teachers`
 * list here must NOT erase teacher rows that the Rewards app already published;
 * this reads the existing directory first and preserves any `type: 'teacher'`
 * entries that the caller didn't supply fresh data for.
 *
 * Staff-account rows are read fresh from the live `staffAccounts` collection here
 * rather than trusted from a caller-supplied array, so two office sessions editing
 * the same school's staff around the same moment can no longer have the second
 * write overwrite the first with a stale snapshot - each call re-derives the
 * directory from whatever is actually in Firestore at that moment. The read here
 * and the `schoolPublic` write below are still two separate operations rather than
 * one transaction (Firestore web SDK transactions can't include an open-ended
 * collection query), so a write that lands in the gap between them can still be
 * briefly overwritten - but every staff mutation triggers a fresh call to this
 * function, so any such loss is corrected by the very next save rather than
 * persisting indefinitely.
 */
export async function syncSchoolStaffDirectory(
  firestore: Firestore,
  schoolId: string,
  teachers: Teacher[] | null | undefined,
): Promise<void> {
  const sid = schoolId.trim().toLowerCase();
  const ref = doc(firestore, 'schoolPublic', sid);

  const staffSnap = await getDocs(staffAccountsCollectionRef(firestore, sid));
  const liveStaffAccounts = staffSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as StaffAccount);

  const next = buildStaffDirectory(teachers, liveStaffAccounts);

  let preservedTeacherRows: StaffPortalLoginOption[] = [];
  if (!teachers || teachers.length === 0) {
    try {
      const existing = await getDoc(ref);
      const existingDirectory = (existing.data()?.staffDirectory ?? []) as StaffPortalLoginOption[];
      preservedTeacherRows = existingDirectory.filter((row) => row.type === 'teacher');
    } catch {
      // If the read fails, fall through with no preserved rows rather than block the write.
    }
  }

  const merged = new Map<string, StaffPortalLoginOption>();
  for (const row of preservedTeacherRows) merged.set(row.id, row);
  for (const row of next) merged.set(row.id, row);

  const now = Date.now();
  await setDoc(
    ref,
    {
      active: true,
      staffDirectory: Array.from(merged.values()),
      staffDirectoryUpdatedAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
}
