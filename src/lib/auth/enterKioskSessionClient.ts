import type { Auth } from 'firebase/auth';
import { httpsCallable, type Functions } from 'firebase/functions';
import { isPublicSampleSchoolId, SAMPLE_SCHOOL_ACCESS_PASSCODE } from '@/lib/sampleSchools';

type EnterKioskSessionResult =
  | { ok: true }
  | { ok: false; message: string; status: number };

async function enterKioskSessionViaApi(
  auth: Auth,
  schoolId: string,
  passcode: string,
): Promise<EnterKioskSessionResult> {
  const user = auth.currentUser;
  if (!user) {
    return {
      ok: false,
      message: 'No Firebase session yet. Refresh the page and try again.',
      status: 0,
    };
  }

  const idToken = await user.getIdToken();
  const res = await fetch('/api/auth/enter-kiosk-session', {
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

  let message = 'Could not register this device for student check-in.';
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data.error === 'string' && data.error.trim()) {
      message = data.error.trim();
    }
  } catch {
    // ignore
  }

  return { ok: false, message, status: res.status };
}

function resolveKioskPasscode(schoolId: string, passcode?: string): string {
  const trimmed = passcode?.trim() ?? '';
  if (trimmed) return trimmed;
  if (isPublicSampleSchoolId(schoolId)) return SAMPLE_SCHOOL_ACCESS_PASSCODE;
  return '';
}

function canUseKioskApiFallback(status: number, code: string, hasPasscode: boolean): boolean {
  if (hasPasscode && (code === 'permission-denied' || code === 'functions/permission-denied')) {
    return true;
  }
  return status === 503 || status === 502 || status === 404;
}

function callableErrorCode(err: unknown): string {
  const code = (err as { code?: unknown })?.code;
  return typeof code === 'string' ? code : '';
}

/**
 * Registers the current browser for kiosk student lookups and Firestore reads.
 * Local dev: SSR API first (Admin SDK + demo-school bypass), callable backup.
 * Production: callable first, SSR API backup when infrastructure errors.
 */
export async function establishStudentKioskSessionClient(
  auth: Auth,
  functions: Functions,
  schoolId: string,
  options?: {
    passcode?: string;
    getEntryCodeFromUrl?: () => string;
  },
): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }

  const sid = schoolId.trim().toLowerCase();
  const passcode = resolveKioskPasscode(sid, options?.passcode);

  const callCallable = async () => {
    const enter = httpsCallable(functions, 'enterSchoolKioskSession');
    await enter({ schoolId: sid, passcode });
  };

  const callApi = async () => {
    const result = await enterKioskSessionViaApi(auth, sid, passcode);
    if (!result.ok) {
      const err = new Error(result.message) as Error & { status?: number };
      err.status = result.status;
      throw err;
    }
  };

  const tryEntryCodeFallback = async (err: unknown) => {
    const code = options?.getEntryCodeFromUrl?.() ?? '';
    if (!code) throw err;
    const verify = httpsCallable(functions, 'verifySchoolEntryCode');
    await verify({ schoolId: sid, code });
  };

  if (process.env.NODE_ENV === 'development') {
    try {
      await callApi();
      return;
    } catch (apiErr) {
      try {
        await callCallable();
        return;
      } catch (callableErr) {
        try {
          await tryEntryCodeFallback(callableErr);
          return;
        } catch {
          throw apiErr;
        }
      }
    }
  }

  try {
    await callCallable();
    return;
  } catch (callableErr) {
    const status = (callableErr as { status?: number })?.status ?? 0;
    const code = callableErrorCode(callableErr);
    if (canUseKioskApiFallback(status, code, passcode.length > 0)) {
      try {
        await callApi();
        return;
      } catch {
        // fall through
      }
    }
    try {
      await tryEntryCodeFallback(callableErr);
    } catch {
      throw callableErr;
    }
  }
}
