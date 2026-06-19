import type { Auth } from 'firebase/auth';
import { FIREBASE_SESSION_COOKIE_NAME } from '@/lib/auth/firebaseSessionCookie';
import {
  resolveSchoolLoginNextUrl,
} from '@/lib/auth/schoolLoginRedirect';
import { userHasGoogleProvider } from '@/lib/google/googleAuthSession';

async function postFirebaseSessionCookie(idToken: string): Promise<boolean> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    credentials: 'include',
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { ok?: boolean; skipped?: boolean };
  return data.ok === true || data.skipped === true;
}

async function postSchoolGateCookie(idToken: string, schoolId: string): Promise<boolean> {
  const res = await fetch('/api/auth/school-gate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, schoolId: schoolId.trim().toLowerCase() }),
    credentials: 'include',
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { ok?: boolean; skipped?: boolean };
  return data.ok === true || data.skipped === true;
}

export async function syncFirebaseSessionCookie(auth: Auth): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const idToken = await user.getIdToken(userHasGoogleProvider(user));
    return postFirebaseSessionCookie(idToken);
  } catch {
    return false;
  }
}

export async function syncSchoolGateCookie(auth: Auth, schoolId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !schoolId.trim()) return false;
  try {
    const idToken = await user.getIdToken();
    return postSchoolGateCookie(idToken, schoolId);
  } catch {
    return false;
  }
}

/** Mint Firebase session + school gate cookies in parallel (one ID token fetch). */
export async function syncSchoolSessionCookies(auth: Auth, schoolId: string): Promise<boolean> {
  const user = auth.currentUser;
  const sid = schoolId.trim().toLowerCase();
  if (!user || !sid) return false;
  try {
    const idToken = await user.getIdToken(userHasGoogleProvider(user));
    const [okFb, okGate] = await Promise.all([
      postFirebaseSessionCookie(idToken),
      postSchoolGateCookie(idToken, sid),
    ]);
    return okFb && okGate;
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
  const ok = await syncSchoolSessionCookies(auth, sid);
  if (!ok) return false;

  const nextUrl = resolveSchoolLoginNextUrl(sid);

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
