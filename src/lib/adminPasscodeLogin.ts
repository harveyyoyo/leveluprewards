import type { Auth } from 'firebase/auth';
import { httpsCallable, type Functions } from 'firebase/functions';
import { authFetch } from '@/lib/authFetch';
import { refreshGoogleIdToken } from '@/lib/google/googleAuthSession';
import {
  isCallableInfrastructureError,
  isSchoolAccessCredentialError,
  messageFromVerifySchoolAccessError,
} from '@/lib/loginResult';

type VerifyAdminResult =
  | { ok: true }
  | { ok: false; message: string; infrastructureFailure?: boolean; credentialFailure?: boolean };

function canUseAdminApiFallback(status: number): boolean {
  return status === 503 || status === 502 || status === 404 || status === 0;
}

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

  const isGoogleBypass = passcode.trim().length === 0;
  if (isGoogleBypass) {
    await refreshGoogleIdToken(user);
  }

  let res: Response;
  if (isGoogleBypass) {
    const token = await user.getIdToken(true);
    res = await fetch('/api/auth/verify-admin-passcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        schoolId: schoolId.trim().toLowerCase(),
        passcode,
      }),
    });
  } else {
    res = await authFetch(auth, '/api/auth/verify-admin-passcode', {
      method: 'POST',
      body: JSON.stringify({
        schoolId: schoolId.trim().toLowerCase(),
        passcode,
      }),
    });
  }

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
  auth: Auth,
  functions: Functions,
  schoolId: string,
  passcode: string,
): Promise<VerifyAdminResult> {
  try {
    if (passcode.trim().length === 0) {
      await refreshGoogleIdToken(auth.currentUser);
    }
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
      credentialFailure: isSchoolAccessCredentialError(e),
    };
  }
}

function apiRouteResultToVerifyResult(
  apiResult: { ok: true } | { ok: false; message: string; status: number },
): VerifyAdminResult {
  if (apiResult.ok) return apiResult;
  return {
    ok: false,
    message: apiResult.message,
    infrastructureFailure: canUseAdminApiFallback(apiResult.status),
    credentialFailure:
      apiResult.status === 403 || apiResult.status === 404 || apiResult.status === 412,
  };
}

/**
 * Run callable + SSR API in parallel; first success wins.
 * Waits for every attempt before returning a credential error (avoids false
 * negatives when one backend is slower — same pattern as school login).
 */
async function raceAdminPasscodeVerification(
  auth: Auth,
  functions: Functions,
  schoolId: string,
  passcode: string,
): Promise<VerifyAdminResult> {
  const tasks: Promise<VerifyAdminResult>[] = [
    verifyAdminPasscodeViaApi(auth, schoolId, passcode).then(apiRouteResultToVerifyResult),
    verifyAdminPasscodeViaCallable(auth, functions, schoolId, passcode),
  ];

  return new Promise((resolve) => {
    let remaining = tasks.length;
    let resolved = false;
    const successes: VerifyAdminResult[] = [];
    const credentialFailures: VerifyAdminResult[] = [];
    const otherFailures: VerifyAdminResult[] = [];

    const finish = () => {
      if (resolved) return;
      if (successes.length > 0) {
        resolved = true;
        resolve(successes[0]!);
        return;
      }
      if (remaining > 0) return;
      resolved = true;
      resolve(
        credentialFailures[0] ??
          otherFailures[0] ?? { ok: false, message: 'Could not verify admin passcode.' },
      );
    };

    for (const task of tasks) {
      void task.then((result) => {
        remaining -= 1;
        if (result.ok) successes.push(result);
        else if (result.credentialFailure) credentialFailures.push(result);
        else otherFailures.push(result);
        finish();
      });
    }
  });
}

/**
 * Verify an admin passcode via Next API (local/stale-callable friendly) or Cloud Function.
 * Production: callable + SSR API in parallel (avoids Cloud Function cold-start delay).
 * Development: local API first so `npm run dev` behaves like the portal path.
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

  if (args.passcode.trim().length === 0) {
    await refreshGoogleIdToken(auth.currentUser);
  }

  if (process.env.NODE_ENV === 'development') {
    const apiResult = await verifyAdminPasscodeViaApi(auth, args.schoolId, args.passcode);
    if (apiResult.ok) return apiResult;

    if (apiResult.status === 503 || apiResult.status === 502) {
      const callableResult = await verifyAdminPasscodeViaCallable(
        auth,
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

  const raced = await raceAdminPasscodeVerification(auth, functions, args.schoolId, args.passcode);
  if (raced.ok) return raced;
  return { ok: false, message: raced.message };
}
