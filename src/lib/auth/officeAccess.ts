import type { LoginState } from '@/components/providers/AuthProvider';

/** Firestore rules for office* / sss collections require roles_admin, roles_office, or developerUids. */
export function hasVerifiedOfficeFirestoreAccess(params: {
  loginState: LoginState | string | null | undefined;
  isAdmin: boolean;
  isOffice: boolean;
  schoolId?: string | null;
}): boolean {
  const { loginState, isAdmin, isOffice, schoolId } = params;
  if (loginState === 'developer') {
    return schoolId?.trim() ? isAdmin : true;
  }
  if (loginState === 'admin') return isAdmin;
  if (loginState === 'office') return isOffice;
  return false;
}
