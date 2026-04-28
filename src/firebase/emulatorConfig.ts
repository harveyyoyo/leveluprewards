/**
 * Ports must match firebase.json ("emulators" block) unless overridden via NEXT_PUBLIC_*.
 * See .env.example for enabling the localhost Firebase Emulator Suite.
 */

const DEFAULTPorts = {
  auth: 9099,
  firestore: 8080,
  functions: 5001,
  storage: 9199,
} as const;

export function firebaseEmulatorsEnabledByEnv(): boolean {
  const v = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS;
  return v === '1' || v === 'true';
}

/**
 * Emulator wiring is only intended for local development (never production deployments).
 */
export function shouldConnectFirebaseEmulators(): boolean {
  if (typeof window === 'undefined') return false;
  if (!firebaseEmulatorsEnabledByEnv()) return false;

  const localHost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]';

  if (process.env.NODE_ENV === 'development') return true;
  return localHost;
}

export function getFirebaseEmulatorHost(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST?.trim() || '127.0.0.1';
}

export function parseEmulatorPort(
  fallback: keyof typeof DEFAULTPorts,
  env?: string | undefined,
): number {
  if (env) {
    const n = Number.parseInt(env, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULTPorts[fallback];
}
