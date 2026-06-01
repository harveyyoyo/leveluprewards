import { doc, setDoc, type Firestore } from 'firebase/firestore';
import type { StaffAccount, StaffAccountRole, Teacher, TeacherPersonnelRole } from '@/lib/types';
import { normalizeTeacherPersonnelRole } from '@/lib/teacherPersonnelRole';

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
    expected.set(key, {
      id: key,
      sourceId: teacher.id,
      type: 'teacher',
      label: teacher.name.trim(),
      username,
      personnelRole: personnelRole === 'teacher' ? undefined : personnelRole,
      updatedAt: now,
    });
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

/** Publish teachers + desk staff to `schoolPublic` for portal staff sign-in. */
export async function syncSchoolStaffDirectory(
  firestore: Firestore,
  schoolId: string,
  teachers: Teacher[] | null | undefined,
  staffAccounts: StaffAccount[] | null | undefined,
): Promise<void> {
  const staffDirectory = buildStaffDirectory(teachers, staffAccounts);
  const now = Date.now();
  await setDoc(
    doc(firestore, 'schoolPublic', schoolId),
    {
      active: true,
      staffDirectory,
      staffDirectoryUpdatedAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
}
