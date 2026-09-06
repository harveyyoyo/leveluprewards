import { getReadableErrorMessage, OFFLINE_USER_MESSAGE } from '@/lib/errorMessage';

export const KIOSK_SCHOOL_CONNECTION_MESSAGE =
  'This kiosk could not confirm its school connection. Try reconnecting, or go back to the school portal and open Student Check-in again.';

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code.toLowerCase() : '';
}

function errorMessage(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message.toLowerCase() : '';
}

/** Lost kiosk membership or expired school session — reconnect, do not show staff-permission copy. */
export function isKioskSchoolConnectionError(error: unknown): boolean {
  const code = errorCode(error);
  const tail = code.split('/').pop() ?? '';
  const message = errorMessage(error);
  return (
    tail === 'permission-denied' ||
    tail === 'unauthenticated' ||
    message.includes('missing or insufficient permissions')
  );
}

/** Copy for the student profile load screen on the kiosk. */
export function kioskStudentLoadHelpText(
  studentLoadError: unknown,
  reconnectError: string | null,
): string {
  if (reconnectError?.trim()) return reconnectError.trim();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return OFFLINE_USER_MESSAGE;
  }
  if (isKioskSchoolConnectionError(studentLoadError)) {
    return KIOSK_SCHOOL_CONNECTION_MESSAGE;
  }
  return getReadableErrorMessage(studentLoadError, KIOSK_SCHOOL_CONNECTION_MESSAGE);
}
