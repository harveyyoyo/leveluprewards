type GenericError = {
  code?: string;
  message?: string;
};

const OFFLINE_HINT =
  "Can't reach the server — check your connection and try again.";

const PERMISSION_HINT =
  "You don't have permission to do this. If you're signed in, ask a teacher or admin for help.";

/** When HTTPS callables only return codes like `functions/internal` and message `INTERNAL`. */
function getFirebaseCallableConnectivityHint(): string {
  let dev = '';
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      const emulatorWired = !!(window as { __SCHOOL_ARCADE_FIREBASE_EMULATORS__?: boolean })
        .__SCHOOL_ARCADE_FIREBASE_EMULATORS__;
      dev = emulatorWired
        ? ' On localhost: NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR is enabled but the emulator is not reachable. Run `firebase emulators:start --only functions` in another terminal, or set NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR=false in .env.local and restart `npm run dev`.'
        : ' On localhost: either deploy functions (`firebase deploy --only functions`) or enable the emulator (NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR=true in .env.local, `firebase emulators:start --only functions`, then restart `npm run dev`).';
    }
  }
  return `Could not reach or run Firebase Cloud Functions. Check VPN/firewall/proxy (allow *.cloudfunctions.net and *.googleapis.com), then try again.${dev}`;
}

/** e.g. `functions/internal` → `internal` (gRPC / Firebase Functions client). */
function tailErrorCode(code: string): string {
  if (!code) return '';
  const parts = code.toLowerCase().split('/');
  return parts[parts.length - 1] ?? '';
}

/** Callable sometimes exposes only `message: "internal"` with no usable `code`. */
const CRYPTIC_SINGLE_TOKEN_MESSAGES = new Set([
  'internal',
  'unknown',
  'unavailable',
  'cancelled',
  'aborted',
  'deadline-exceeded',
]);

/**
 * Short, consistent copy for kiosks and toasts when the device has no network
 * or the app cannot reach Firebase (matches student-route offline banner).
 */
export const OFFLINE_USER_MESSAGE = 'Offline — nothing syncs until you reconnect.';

/** Student kiosk sign-in when the device is offline and badge lookup cannot reach the server. */
export const STUDENT_OFFLINE_SIGNIN_MESSAGE =
  'No internet. If you have signed in on this device before, enter your student ID again. Otherwise reconnect and try again.';

/**
 * Normalize Firebase/network errors so users see actionable messages.
 */
export function getReadableErrorMessage(error: unknown, fallback: string): string {
  const err = (error ?? {}) as GenericError;
  const code = String(err.code ?? '').toLowerCase();
  const codeTail = tailErrorCode(code);
  const rawMessage = String(err.message ?? '').trim();
  const message = rawMessage.toLowerCase();

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]');

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return OFFLINE_USER_MESSAGE;
  }

  if (code === 'permission-denied' || code === 'permissions-denied') {
    return PERMISSION_HINT;
  }

  if (message.includes('missing initial state')) {
    return 'Google sign-in was interrupted. Open this page in Safari or Chrome (not an in-app browser), then try again.';
  }

  if (code === 'unauthenticated' || codeTail === 'unauthenticated') {
    if (rawMessage.toLowerCase().includes('function must be called while authenticated')) {
      return 'This action needs Firebase Auth. For student kiosks, enable Anonymous under Firebase Console → Authentication → Sign-in method, then refresh the page.';
    }
    return 'Your session expired. Please sign in again.';
  }

  if (
    code.includes('network-request-failed') ||
    codeTail === 'network-request-failed' ||
    message.includes('network-request-failed') ||
    message.includes('internal assertion failed')
  ) {
    // Callable failures in local dev are commonly emulator/deploy mismatch, not "corporate firewall".
    if (isLocalhost && code.includes('functions/')) {
      return getFirebaseCallableConnectivityHint();
    }
    return OFFLINE_HINT;
  }

  if (
    code === 'unavailable' ||
    codeTail === 'unavailable' ||
    code === 'deadline-exceeded' ||
    codeTail === 'deadline-exceeded' ||
    code === 'cancelled' ||
    codeTail === 'cancelled' ||
    code === 'aborted' ||
    codeTail === 'aborted' ||
    code === 'resource-exhausted' ||
    codeTail === 'resource-exhausted' ||
    code.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('offline') ||
    message.includes('client is offline')
  ) {
    if (isLocalhost && code.includes('functions/')) {
      return getFirebaseCallableConnectivityHint();
    }
    return OFFLINE_HINT;
  }

  if (code === 'failed-precondition' || codeTail === 'failed-precondition') {
    return OFFLINE_HINT;
  }

  if (code === 'not-found' || codeTail === 'not-found') {
    return 'That item could not be found. It may have been removed.';
  }

  if (message.includes('missing or insufficient permissions')) {
    return PERMISSION_HINT;
  }

  // Firebase callable: `functions/internal` + message `INTERNAL` is not a useful server error—
  // often network, blocking, wrong project, or undeployed/emulator mismatch. Handle before the
  // generic "cryptic token" branch so we don't mislabel it as a generic offline page load.
  if (code.includes('functions/')) {
    const noUsefulDetail =
      !rawMessage ||
      (!rawMessage.includes(' ') && CRYPTIC_SINGLE_TOKEN_MESSAGES.has(message));
    if (
      noUsefulDetail &&
      (codeTail === 'internal' ||
        codeTail === 'unknown' ||
        codeTail === 'unavailable' ||
        codeTail === 'deadline-exceeded' ||
        codeTail === 'cancelled' ||
        codeTail === 'aborted')
    ) {
      return getFirebaseCallableConnectivityHint();
    }
  }

  // Cryptic single-token messages (e.g. "internal", "unknown") carry no useful
  // info. Only then do we fall back to the offline hint.
  if (rawMessage && !rawMessage.includes(' ') && CRYPTIC_SINGLE_TOKEN_MESSAGES.has(message)) {
    return OFFLINE_HINT;
  }

  // `functions/internal` with a real message usually means the server threw.
  // Surface that message so the user/operator gets an actionable clue instead
  // of a misleading "cannot reach the server" toast.
  if ((codeTail === 'internal' || codeTail === 'unknown') && rawMessage) {
    return rawMessage;
  }

  if (codeTail === 'internal' || codeTail === 'unknown') {
    return OFFLINE_HINT;
  }

  if (rawMessage) return rawMessage;
  return fallback;
}
