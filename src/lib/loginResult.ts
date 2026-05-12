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
  return getReadableErrorMessage(error, invalidCredentialsMessage);
}
