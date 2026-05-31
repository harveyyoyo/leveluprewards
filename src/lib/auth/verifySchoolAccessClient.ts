import type { Auth } from 'firebase/auth';
import { httpsCallable, type Functions } from 'firebase/functions';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';
import { messageFromVerifySchoolAccessError } from '@/lib/loginResult';

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

  if (process.env.NODE_ENV === 'development' && res.status === 503 && functions) {
    try {
      if (isGoogleLinked && passcode.trim().length === 0) {
        await user.getIdToken(true);
      }
      if (passcode.trim().length === 0 && isAllowedDeveloperGoogleUser(user)) {
        const granted = await grantDeveloperSchoolAccess(functions, schoolId);
        if (granted) return { ok: true };
      }
      const verify = httpsCallable(functions, 'verifySchoolAccessPasscode');
      await verify({
        schoolId: schoolId.trim().toLowerCase(),
        passcode,
      });
      return { ok: true };
    } catch (e) {
      console.error('verifySchoolAccessPasscode fallback failed:', e);
      return {
        ok: false,
        message: messageFromVerifySchoolAccessError(e, 'Invalid School ID or passcode.'),
      };
    }
  }

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

  return { ok: false, message };
}
