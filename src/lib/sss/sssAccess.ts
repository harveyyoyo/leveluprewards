import type { LoginState } from '@/components/providers/AuthProvider';
import { hasVerifiedOfficeFirestoreAccess } from '@/lib/auth/officeAccess';

export function hasSssPortalLoginIntent(loginState: LoginState | string | null | undefined): boolean {
  return loginState === 'office' || loginState === 'admin' || loginState === 'developer';
}

export function hasVerifiedSssFirestoreAccess(params: {
  loginState: LoginState | string | null | undefined;
  isAdmin: boolean;
  isOffice: boolean;
  schoolId?: string | null;
}): boolean {
  return hasVerifiedOfficeFirestoreAccess(params);
}
