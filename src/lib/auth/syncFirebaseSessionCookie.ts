import type { Auth } from 'firebase/auth';
import { FIREBASE_SESSION_COOKIE_NAME } from '@/lib/auth/firebaseSessionCookie';
import { sanitizeInternalNextPath } from '@/lib/auth/internalNextRedirect';

export async function syncFirebaseSessionCookie(auth: Auth): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncSchoolGateCookie(auth: Auth, schoolId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !schoolId.trim()) return false;
  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/auth/school-gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, schoolId: schoolId.trim().toLowerCase() }),
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean; skipped?: boolean };
    return data.ok === true || data.skipped === true;
  } catch {
    return false;
  }
}

export async function clearFirebaseSessionCookie(): Promise<void> {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // ignore
  }
}

export async function clearSchoolGateCookie(): Promise<void> {
  try {
    await fetch('/api/auth/school-gate', {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // ignore
  }
}

/** Mint edge cookies, then hard-navigate so middleware sees them on first paint. */
export async function navigateAfterSchoolLogin(auth: Auth, schoolId: string): Promise<boolean> {
  const sid = schoolId.trim().toLowerCase();
  if (!sid) return false;
  const okFb = await syncFirebaseSessionCookie(auth);
  if (!okFb) return false;
  const okGate = await syncSchoolGateCookie(auth, sid);
  if (!okGate) return false;

  let nextUrl = `/${sid}/portal`;
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const nextParam = params.get('next');
      if (nextParam) {
        const target = sanitizeInternalNextPath(nextParam, sid);
        if (target) {
          nextUrl = target;
        }
      }
    } catch {
      // ignore
    }
  }

  window.location.assign(nextUrl);
  return true;
}

/** Best-effort clear before navigation (logout); avoids blocking on `await`. */
export function clearFirebaseSessionCookieSync(): void {
  try {
    void fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
      keepalive: true,
    });
  } catch {
    // ignore
  }
}

export { FIREBASE_SESSION_COOKIE_NAME };
