import type { Auth } from 'firebase/auth';
import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';
import { authFetch } from '@/lib/authFetch';
import { functionsEmulatorEnabledByEnv } from '@/firebase/emulatorConfig';

/** Roles added after some production function deployments; stale callables reject these. */
export const ROLES_NEEDING_UPDATED_VERIFY = ['librarian', 'office'] as const;

export type StaffDeskLoginRole =
  | 'secretary'
  | 'prizeClerk'
  | 'reports'
  | 'librarian'
  | 'office';

export type StaffDeskVerifyResult = {
  displayName?: string;
  roles?: string[];
};

function isStaleCallableRole(role: string): boolean {
  return (ROLES_NEEDING_UPDATED_VERIFY as readonly string[]).includes(role);
}

export function staffDeskLoginSetupMessage(role: StaffDeskLoginRole): string {
  if (role === 'librarian' || role === 'office') {
    return (
      'Librarian sign-in needs an updated server. On localhost: set NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR=true in .env.local, run `firebase emulators:start --only functions`, then restart `npm run dev`. ' +
      'For production: deploy Cloud Functions (`firebase deploy --only functions:verifyStaffAccountPasscode`).'
    );
  }
  return 'Staff sign-in could not reach the server. Check your connection or try again in a moment.';
}

/**
 * Verify desk-staff username + passcode via Next API (preferred) or Cloud Function.
 * Never calls a stale production callable for librarian/office when the emulator is off.
 */
export async function verifyStaffDeskLogin(
  auth: Auth,
  functions: Functions,
  args: {
    schoolId: string;
    username: string;
    passcode: string;
    role: StaffDeskLoginRole;
  },
): Promise<StaffDeskVerifyResult> {
  const { schoolId, username, passcode, role } = args;
  const emulatorOn = functionsEmulatorEnabledByEnv();

  const apiRes = await authFetch(auth, '/api/auth/verify-staff-passcode', {
    method: 'POST',
    body: JSON.stringify({ schoolId, username, passcode, role }),
  });

  if (apiRes.ok) {
    return (await apiRes.json()) as StaffDeskVerifyResult;
  }

  const errBody = (await apiRes.json().catch(() => ({}))) as { error?: string };
  const apiError = typeof errBody.error === 'string' ? errBody.error : '';

  const canUseCallableFallback =
    apiRes.status === 503 || apiRes.status === 404 || apiRes.status === 502;

  if (canUseCallableFallback && isStaleCallableRole(role) && !emulatorOn) {
    throw new Error(staffDeskLoginSetupMessage(role));
  }

  if (canUseCallableFallback) {
    const verify = httpsCallable(functions, 'verifyStaffAccountPasscode');
    const res = await verify({ schoolId, username, passcode, role });
    return res.data as StaffDeskVerifyResult;
  }

  if (apiError.toLowerCase().includes('role must be')) {
    throw new Error(staffDeskLoginSetupMessage(role));
  }

  throw new Error(apiError || 'Invalid staff login.');
}
