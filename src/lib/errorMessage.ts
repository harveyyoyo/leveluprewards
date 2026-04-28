type GenericError = {
  code?: string;
  message?: string;
};

const OFFLINE_HINT =
  'Cannot reach the server. This can be caused by a flaky connection, a captive portal, VPN/proxy filtering, or a network rule blocking Firebase (try allowing `*.cloudfunctions.net` and `*.googleapis.com`).';

const PERMISSION_HINT =
  "You don't have permission to do this. If you're signed in, ask a teacher or admin for help.";

/** When HTTPS callables only return codes like `functions/internal` and message `INTERNAL`. */
function getFirebaseCallableConnectivityHint(): string {
  let dev = '';
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      dev =
        ' On localhost: deploy Cloud Functions to this Firebase project (including face-auth callables), or connect the Firebase CLI Functions emulator.';
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
 * Normalize Firebase/network errors so users see actionable messages.
 */
export function getReadableErrorMessage(error: unknown, fallback: string): string {
  const err = (error ?? {}) as GenericError;
  const code = String(err.code ?? '').toLowerCase();
  const codeTail = tailErrorCode(code);
  const rawMessage = String(err.message ?? '').trim();
  const message = rawMessage.toLowerCase();

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'No internet connection. Check your network and try again.';
  }

  if (code === 'permission-denied' || code === 'permissions-denied') {
    return PERMISSION_HINT;
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
    return OFFLINE_HINT;
  }

  if (code === 'failed-precondition' || codeTail === 'failed-precondition') {
    return 'The app could not complete that request right now. Check your connection and try again.';
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
