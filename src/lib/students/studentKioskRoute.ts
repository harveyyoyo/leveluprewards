import type { LoginState } from '@/components/providers/AuthProvider';

/**
 * Permanent, hardwired URL for the student check-in kiosk: `/{schoolId}/student`.
 * This URL must NEVER change, be renamed, or be moved, even during major site redesigns.
 */
export function studentKioskPath(schoolId: string): string {
  const sid = schoolId.trim().toLowerCase();
  return `/${sid}/student`;
}

/** True when the browser is on the student kiosk surface for this school. */
export function isStudentKioskRoute(pathname: string | null | undefined, schoolId: string | null): boolean {
  if (!pathname || !schoolId) return false;
  const sid = schoolId.trim().toLowerCase();
  return pathname === `/${sid}/student` || pathname.startsWith(`/${sid}/student/`);
}

/**
 * Student kiosk UI prefs (theme, display mode) apply on the kiosk route under a school session.
 * Legacy `loginState === 'student'` is still recognized until old tabs refresh.
 */
export function isStudentKioskUiContext(
  loginState: LoginState | string,
  pathname: string | null | undefined,
  schoolId: string | null,
): boolean {
  if (loginState === 'student') return true;
  return loginState === 'school' && isStudentKioskRoute(pathname, schoolId);
}

/** School chooser / portal hub: one school account, not a separate student login. */
export function isSchoolPortalChooser(loginState: LoginState | string): boolean {
  return loginState === 'school' || loginState === 'student';
}
