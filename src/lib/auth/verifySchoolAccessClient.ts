import type { Auth } from 'firebase/auth';
import { httpsCallable, type Functions } from 'firebase/functions';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';
import { isCallableInfrastructureError, messageFromVerifySchoolAccessError } from '@/lib/loginResult';

type VerifySchoolAccessResult =
  | { ok: true }
  | { ok: false; message: string; infrastructureFailure?: boolean };

async function grantDeveloperSchoolAccess(
  functions: Functions,
  schoolId: string,
): Promise<boolean> {
  try {
    const addDeveloperMe = httpsCallable(functions, 'addDeveloperMe');
    await addDeveloperMe({});

    const startSupportSession = httpsCallable(functions, 'startDeveloperSupportSession');
    await startSupportSession({ schoolId: schoolId.trim().toLowerCase() });
    return true;
  } catch (e) {
    console.error('Developer school access fallback failed:', e);
    return false;
  }
}

function canUseSchoolAccessApiFallback(status: number): boolean {
  return status === 503 || status === 502 || status === 404;
}

async function verifySchoolAccessViaCallable(
  auth: Auth,
  functions: Functions,
  schoolId: string,
  passcode: string,
  options?: { allowDeveloperBypass?: boolean },
): Promise<VerifySchoolAccessResult> {
  const user = auth.currentUser;
  if (!user) {
    return { ok: false, message: 'No Firebase session yet. Refresh the page and try again.' };
  }

  const normalizedSchoolId = schoolId.trim().toLowerCase();
  const passcodeTrimmed = passcode.trim();
  const isGoogleLinked = user.providerData.some((p) => p.providerId === 'google.com');

  try {
    if (isGoogleLinked && passcodeTrimmed.length === 0) {
      await user.getIdToken(true);
    }
    if (
      options?.allowDeveloperBypass &&
      passcodeTrimmed.length === 0 &&
      isAllowedDeveloperGoogleUser(user)
    ) {
      const granted = await grantDeveloperSchoolAccess(functions, normalizedSchoolId);
      if (granted) return { ok: true };
    }
    const verify = httpsCallable(functions, 'verifySchoolAccessPasscode');
    await verify({ schoolId: normalizedSchoolId, passcode });
    return { ok: true };
  } catch (e) {
    console.error('verifySchoolAccessPasscode failed:', e);
    return {
      ok: false,
      message: messageFromVerifySchoolAccessError(e, 'Invalid School ID or passcode.'),
      infrastructureFailure: isCallableInfrastructureError(e),
    };
  }
}

async function verifySchoolAccessViaApiRoute(
  auth: Auth,
  schoolId: string,
  passcode: string,
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const user = auth.currentUser;
  if (!user) {
    return {
      ok: false,
      message: 'No Firebase session yet. Refresh the page and try again.',
      status: 0,
    };
  }

  const isGoogleLinked = user.providerData.some((p) => p.providerId === 'google.com');
  const idToken = await user.getIdToken(isGoogleLinked && passcode.trim().length === 0);
  const res = await fetch('/api/auth/verify-school-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      schoolId: schoolId.trim().toLowerCase(),
      passcode,
    }),
    credentials: 'include',
  });

  if (res.ok) return { ok: true };

  let message = 'Invalid School ID or passcode.';
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data.error === 'string' && data.error.trim()) {
      message = data.error.trim();
    }
  } catch {
    // ignore
  }

  if (res.status === 404) {
    message = 'No school with that ID was found.';
  }

  return { ok: false, message, status: res.status };
}

/**
 * School access gate used by the login page.
 * Production: callable first (independently deployed Admin SDK), SSR API backup.
 * Development: local SSR API first (works with .env.local Admin creds), callable backup.
 */
export async function verifySchoolAccessViaApi(
  auth: Auth,
  schoolId: string,
  passcode: string,
  functions?: Functions,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = auth.currentUser;
  if (!user) {
    return { ok: false, message: 'No Firebase session yet. Refresh the page and try again.' };
  }

  const devOptions = { allowDeveloperBypass: true as const };

  if (process.env.NODE_ENV === 'development') {
    const apiResult = await verifySchoolAccessViaApiRoute(auth, schoolId, passcode);
    if (apiResult.ok) return apiResult;

    if (functions) {
      const callableResult = await verifySchoolAccessViaCallable(
        auth,
        functions,
        schoolId,
        passcode,
        devOptions,
      );
      if (callableResult.ok) return callableResult;
      if (!callableResult.infrastructureFailure) {
        return { ok: false, message: callableResult.message };
      }
    }

    return { ok: false, message: apiResult.message };
  }

  if (functions) {
    const callableResult = await verifySchoolAccessViaCallable(
      auth,
      functions,
      schoolId,
      passcode,
      devOptions,
    );
    if (callableResult.ok) return callableResult;
    if (!callableResult.infrastructureFailure) {
      return { ok: false, message: callableResult.message };
    }
  }

  const apiResult = await verifySchoolAccessViaApiRoute(auth, schoolId, passcode);
  if (apiResult.ok) return apiResult;

  if (functions && canUseSchoolAccessApiFallback(apiResult.status)) {
    const callableRetry = await verifySchoolAccessViaCallable(
      auth,
      functions,
      schoolId,
      passcode,
      devOptions,
    );
    if (callableRetry.ok) return callableRetry;
    if (!callableRetry.infrastructureFailure) {
      return { ok: false, message: callableRetry.message };
    }
  }

  return { ok: false, message: apiResult.message };
}
