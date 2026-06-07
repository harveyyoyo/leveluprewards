import type { Auth } from 'firebase/auth';
import { httpsCallable, type Functions } from 'firebase/functions';
import { authFetch } from '@/lib/authFetch';
import { isCallableInfrastructureError, messageFromVerifySchoolAccessError } from '@/lib/loginResult';

type VerifyAdminResult = { ok: true } | { ok: false; message: string; infrastructureFailure?: boolean };

async function verifyAdminPasscodeViaApi(
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

  const res = await authFetch(auth, '/api/auth/verify-admin-passcode', {
    method: 'POST',
    body: JSON.stringify({
      schoolId: schoolId.trim().toLowerCase(),
      passcode,
    }),
  });

  if (res.ok) return { ok: true };

  let message = 'Invalid admin passcode.';
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

async function verifyAdminPasscodeViaCallable(
  functions: Functions,
  schoolId: string,
  passcode: string,
): Promise<VerifyAdminResult> {
  try {
    const verify = httpsCallable(functions, 'verifySchoolPasscode');
    await verify({
      schoolId: schoolId.trim().toLowerCase(),
      passcode,
    });
    return { ok: true };
  } catch (e) {
    console.error('verifySchoolPasscode failed:', e);
    return {
      ok: false,
      message: messageFromVerifySchoolAccessError(e, 'Invalid admin passcode.'),
      infrastructureFailure: isCallableInfrastructureError(e),
    };
  }
}

/**
 * Verify an admin passcode via Next API (local/stale-callable friendly) or Cloud Function.
 * Development uses the local API first so `npm run dev` behaves like the portal path.
 */
export async function verifyAdminPasscodeLogin(
  auth: Auth,
  functions: Functions,
  args: {
    schoolId: string;
    passcode: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!auth.currentUser) {
    return { ok: false, message: 'No Firebase session yet. Refresh the page and try again.' };
  }

  if (process.env.NODE_ENV === 'development') {
    const apiResult = await verifyAdminPasscodeViaApi(auth, args.schoolId, args.passcode);
    if (apiResult.ok) return apiResult;

    if (apiResult.status === 503 || apiResult.status === 502) {
      const callableResult = await verifyAdminPasscodeViaCallable(
        functions,
        args.schoolId,
        args.passcode,
      );
      if (callableResult.ok) return callableResult;
      if (!callableResult.infrastructureFailure) {
        return { ok: false, message: callableResult.message };
      }
    }

    return { ok: false, message: apiResult.message };
  }

  const callableResult = await verifyAdminPasscodeViaCallable(functions, args.schoolId, args.passcode);
  if (callableResult.ok) return callableResult;

  // For Google bypass (empty passcode), the callable and API route may have different
  // env var / Firestore access — try the API route as a fallback regardless of error type.
  const isGoogleBypass = args.passcode.trim().length === 0;
  if (!callableResult.infrastructureFailure && !isGoogleBypass) {
    return { ok: false, message: callableResult.message };
  }

  const apiResult = await verifyAdminPasscodeViaApi(auth, args.schoolId, args.passcode);
  if (apiResult.ok) return apiResult;

  // Return the more specific message from whichever path had a real auth rejection.
  return { ok: false, message: isGoogleBypass ? callableResult.message : apiResult.message };
}
