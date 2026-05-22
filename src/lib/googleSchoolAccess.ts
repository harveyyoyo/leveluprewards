import type { User } from 'firebase/auth';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import type { LoginState } from '@/components/providers/AuthProvider';

export function isGoogleSignedInUser(user: User | null | undefined): boolean {
  if (!user || user.isAnonymous) return false;
  return user.providerData.some((p) => p.providerId === 'google.com');
}

export type ResolvedGoogleSchoolRole = {
  loginState: Exclude<LoginState, 'loggedOut' | 'developer' | 'student' | 'school'>;
  userName: string;
  teacherDocId?: string;
};

const STAFF_ROLE_CHECKS: Array<{
  collection: string;
  role: ResolvedGoogleSchoolRole['loginState'];
  userName: string;
}> = [
  { collection: 'roles_admin', role: 'admin', userName: 'Admin' },
  { collection: 'roles_teacher', role: 'teacher', userName: 'Teacher' },
  { collection: 'roles_secretary', role: 'secretary', userName: 'Secretary' },
  { collection: 'roles_prizeClerk', role: 'prizeClerk', userName: 'Prize desk' },
  { collection: 'roles_reports', role: 'reports', userName: 'Reports' },
  { collection: 'roles_librarian', role: 'librarian', userName: 'Librarian' },
  { collection: 'roles_office', role: 'office', userName: 'Office staff' },
  { collection: 'roles_houseCoordinator', role: 'houseCoordinator', userName: 'House coordinator' },
];

/** Highest existing staff role for this Firebase UID at a school (Google session restore). */
export async function resolveExistingSchoolRole(
  firestore: Firestore,
  schoolId: string,
  uid: string,
): Promise<ResolvedGoogleSchoolRole | null> {
  const sid = schoolId.trim().toLowerCase();

  for (const check of STAFF_ROLE_CHECKS) {
    try {
      const roleRef = doc(firestore, 'schools', sid, check.collection, uid);
      const roleDoc = await getDoc(roleRef);
      if (!roleDoc.exists() || roleDoc.data()?.role !== check.role) continue;

      if (check.role === 'teacher') {
        const teacherId = roleDoc.data()?.teacherId;
        return {
          loginState: 'teacher',
          userName: check.userName,
          teacherDocId: typeof teacherId === 'string' ? teacherId : undefined,
        };
      }

      return { loginState: check.role, userName: check.userName };
    } catch {
      // Permission errors mean no readable role doc for this collection.
    }
  }

  return null;
}
