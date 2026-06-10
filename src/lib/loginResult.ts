import { getReadableErrorMessage } from '@/lib/errorMessage';

export type LoginResult = { ok: true } | { ok: false; message: string };

export function loginOk(): LoginResult {
  return { ok: true };
}

export function loginErr(message: string): LoginResult {
  return { ok: false, message };
}

function callableErrorTail(code: string): string {
  const parts = code.toLowerCase().split('/');
  return parts[parts.length - 1] ?? '';
}

/** Wrong school id/passcode — do not try another backend with the same credentials. */
export function isSchoolAccessCredentialError(error: unknown): boolean {
  const tail = callableErrorTail(String((error as { code?: string }).code ?? ''));
  return tail === 'permission-denied' || tail === 'not-found';
}

/** True when a callable failed for transport/server reasons (safe to try another backend). */
export function isCallableInfrastructureError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  const tail = callableErrorTail(String(err.code ?? ''));
  const raw = String(err.message ?? '').trim().toLowerCase();

  if (
    ['permission-denied', 'not-found', 'invalid-argument', 'failed-precondition', 'unauthenticated'].includes(
      tail,
    )
  ) {
    return false;
  }
  if (['unavailable', 'internal', 'deadline-exceeded', 'resource-exhausted', 'unknown'].includes(tail)) {
    return true;
  }
  if (
    /failed to fetch|network error|econnrefused|connection refused|emulator|timed out|timeout|could not reach/i.test(
      raw,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Human text for failures from `verifySchoolAccessPasscode` (and the same HTTP codes from similar gates).
 * Distinguishes wrong ID/pass from connectivity so the UI does not blame credentials when offline.
 */
export function messageFromVerifySchoolAccessError(
  error: unknown,
  invalidCredentialsMessage: string,
): string {
  const err = error as { code?: string; message?: string };
  const tail = callableErrorTail(String(err.code ?? ''));
  const raw = String(err.message ?? '').trim();

  if (tail === 'not-found') {
    return 'No school with that ID was found.';
  }
  if (tail === 'permission-denied') {
    return invalidCredentialsMessage;
  }
  if (tail === 'invalid-argument') {
    return raw || invalidCredentialsMessage;
  }
  if (tail === 'failed-precondition') {
    return (
      raw ||
      'This school is not ready for sign-in yet. Ask an administrator to configure the access passcode.'
    );
  }
  return getReadableErrorMessage(error, invalidCredentialsMessage);
}
