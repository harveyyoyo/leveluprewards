import type { Student } from '@/lib/types';

/**
 * When false, welcome styles (`/student/welcome`) are hidden and Settings shows “Soon”.
 * Set to true when the feature is ready to ship.
 */
export const STUDENT_WELCOME_STYLES_LIVE = false;

/** localStorage key for a student's chosen welcome animation (kiosk). */
export function welcomeGreetingStyleStorageKey(schoolId: string, studentId: string): string {
  return `levelup_welcome_style_${schoolId}_${studentId}`;
}

export function schoolAllowsStudentWelcome(settings: { enableStudentWelcome?: boolean }): boolean {
  if (!STUDENT_WELCOME_STYLES_LIVE) return false;
  return !!settings.enableStudentWelcome;
}

/** When false on the student record, they never see the welcome page (if school allows). */
export function studentAllowsWelcomePage(student: Pick<Student, 'welcomePageEnabled'> | null | undefined): boolean {
  if (!student) return false;
  return student.welcomePageEnabled !== false;
}

export function studentSeesWelcomePage(
  settings: { enableStudentWelcome?: boolean },
  student: Student | null | undefined,
): boolean {
  return schoolAllowsStudentWelcome(settings) && studentAllowsWelcomePage(student ?? null);
}

/** Kiosk full-screen “welcome back” overlay (not the `/student/welcome` style picker). */
export function schoolAllowsStudentWelcomeBackScreen(settings: { enableStudentWelcomeBackScreen?: boolean }): boolean {
  return !!settings.enableStudentWelcomeBackScreen;
}

export function studentAllowsWelcomeBackScreen(
  student: Pick<Student, 'welcomeBackScreenEnabled'> | null | undefined,
): boolean {
  if (!student) return false;
  return student.welcomeBackScreenEnabled !== false;
}

export function studentSeesWelcomeBackOverlay(
  settings: { enableStudentWelcomeBackScreen?: boolean },
  student: Student | null | undefined,
): boolean {
  return schoolAllowsStudentWelcomeBackScreen(settings) && studentAllowsWelcomeBackScreen(student ?? null);
}
