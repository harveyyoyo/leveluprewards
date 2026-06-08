import type { User } from 'firebase/auth';

import type { LoginResult } from '@/lib/loginResult';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';

/**
 * Trusted Google accounts (developer email allowlist) may provision school admin
 * without entering the school's admin passcode.
 */
export function isAllowedAdminGoogleUser(user: User | null | undefined): boolean {
  return isAllowedDeveloperGoogleUser(user);
}

/** Allowlisted developer Google accounts may attempt admin login without a passcode (server verifies allowlist). */
export function canBypassSchoolAdminPasscode(user: User | null | undefined): boolean {
  return isAllowedDeveloperGoogleUser(user);
}

type AdminLoginFn = (
  type: 'admin',
  credentials: { schoolId: string; passcode?: string },
) => Promise<LoginResult>;

/** School admin login: passcode when required, or Google allowlist bypass when passcode is empty. */
export async function loginSchoolAdmin(
  login: AdminLoginFn,
  user: User | null | undefined,
  schoolId: string,
  passcode?: string,
): Promise<LoginResult> {
  const sid = schoolId.trim().toLowerCase();
  const trimmed = (passcode ?? '').trim();
  if (trimmed) {
    return login('admin', { schoolId: sid, passcode: trimmed });
  }
  if (canBypassSchoolAdminPasscode(user)) {
    return login('admin', { schoolId: sid, passcode: '' });
  }
  return { ok: false, message: 'Enter the admin passcode to continue.' };
}
