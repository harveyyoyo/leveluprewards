import type { Auth, User } from 'firebase/auth';

/** True when Firebase user has a linked or primary Google provider. */
export function userHasGoogleProvider(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.providerData.some((p) => p.providerId === 'google.com');
}

/**
 * After popup/redirect link, the ID token can briefly omit Google identities.
 * Force-refresh before callables that check `isGoogleAuthenticated` on the server.
 */
export async function refreshGoogleIdToken(user: User | null | undefined): Promise<void> {
  if (!user || !userHasGoogleProvider(user)) return;
  try {
    await user.getIdToken(true);
  } catch (e) {
    console.warn('refreshGoogleIdToken failed:', e);
  }
}

/** Wait for auth.currentUser after redirect/popup (Firebase can lag behind getRedirectResult). */
export async function waitForAuthUser(auth: Auth, maxMs: number): Promise<User | null> {
  const stepMs = 100;
  const attempts = Math.ceil(maxMs / stepMs);
  for (let i = 0; i < attempts; i++) {
    if (auth.currentUser) return auth.currentUser;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  return auth.currentUser;
}
