/** Dispatched from Header "Logout" on /student so kiosk exit uses passcode (see StudentLoginPage). */
export const STUDENT_KIOSK_REQUEST_EXIT_EVENT = 'levelup:student-kiosk-request-exit';

export function requestStudentKioskExit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STUDENT_KIOSK_REQUEST_EXIT_EVENT));
  }
}
