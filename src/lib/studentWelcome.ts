import type { Student } from '@/lib/types';

/** localStorage key for a student's chosen welcome animation (kiosk). */
export function welcomeGreetingStyleStorageKey(schoolId: string, studentId: string): string {
  return `levelup_welcome_style_${schoolId}_${studentId}`;
}

export function schoolAllowsStudentWelcome(settings: { enableStudentWelcome?: boolean }): boolean {
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
