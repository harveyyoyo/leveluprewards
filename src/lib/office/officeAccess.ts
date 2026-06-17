import type { LoginState } from '@/components/providers/AuthProvider';

/** Client intent to use the office portal (localStorage / loginState). */
export function hasOfficePortalLoginIntent(loginState: LoginState | string | null | undefined): boolean {
  return loginState === 'office' || loginState === 'admin' || loginState === 'developer';
}

/**
 * Firestore rules for office* collections require roles_admin, roles_office, or developerUids.
 * Only enable queries after AuthProvider has confirmed the matching role flag.
 */
export function hasVerifiedOfficeFirestoreAccess(params: {
  loginState: LoginState | string | null | undefined;
  isAdmin: boolean;
  isOffice: boolean;
  /** When set, developer support at a school needs roles_admin (not just loginState). */
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
