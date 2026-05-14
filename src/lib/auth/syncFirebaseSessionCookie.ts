import type { Auth } from 'firebase/auth';
import { FIREBASE_SESSION_COOKIE_NAME } from '@/lib/auth/firebaseSessionCookie';

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
