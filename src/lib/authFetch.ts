import { useCallback } from 'react';
import { Auth } from 'firebase/auth';
import { useAuth } from '@/firebase';

/**
 * `fetch()` wrapper that attaches a Firebase ID token to the Authorization
 * header so our server-side AI routes (protected by `guardAiRoute`) can
 * identify and rate-limit the caller.
 *
 * The app signs every visitor in anonymously at boot (see FirebaseProvider),
 * so `auth.currentUser` is effectively always populated by the time the UI
 * calls this. If a token cannot be obtained we still send the request without
 * one — the server will respond with 401 and the caller can surface that.
 */
export async function authFetch(
  auth: Auth | null | undefined,
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const user = auth?.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    } catch {
      // Fall through — server will reject with 401.
    }
  }

  return fetch(input, { ...init, headers });
}

/**
 * Convenience hook so components calling protected API routes don't have to
 * pull `auth` out of `useFirebase` and thread it through manually. Returns a
 * stable `fetch`-shaped function bound to the current Firebase Auth instance.
 */
export function useAuthFetch(): (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response> {
  const auth = useAuth();
  return useCallback(
    (input: RequestInfo | URL, init: RequestInit = {}) => authFetch(auth, input, init),
    [auth],
  );
}
