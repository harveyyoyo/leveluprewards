/**
 * Set before any Google redirect sign-in so bootstrap waits for credentials
 * before anonymous auth (anonymous sign-in would discard redirect credentials).
 */
export const PENDING_DEVELOPER_LOGIN_KEY = 'levelup:pendingDeveloperLogin';

const GOOGLE_REDIRECT_THROTTLE_KEY = 'levelup:googleRedirectAttemptAt';
const GOOGLE_REDIRECT_THROTTLE_MS = 15_000;

export function hasPendingGoogleRedirect(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(PENDING_DEVELOPER_LOGIN_KEY) === 'true';
  } catch {
    return false;
  }
}

/** @deprecated Use hasPendingGoogleRedirect */
export const hasPendingDeveloperGoogleRedirect = hasPendingGoogleRedirect;

export function markPendingGoogleRedirect(): void {
  try {
    sessionStorage.setItem(PENDING_DEVELOPER_LOGIN_KEY, 'true');
  } catch {
    // ignore
  }
}

/** @deprecated Use markPendingGoogleRedirect */
export const markPendingDeveloperGoogleRedirect = markPendingGoogleRedirect;

export function clearPendingGoogleRedirect(): void {
  try {
    sessionStorage.removeItem(PENDING_DEVELOPER_LOGIN_KEY);
  } catch {
    // ignore
  }
}

/** @deprecated Use clearPendingGoogleRedirect */
export const clearPendingDeveloperGoogleRedirect = clearPendingGoogleRedirect;

/** Prevents rapid redirect→anonymous→redirect loops when popup sign-in is blocked. */
export function shouldThrottleGoogleRedirect(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    const last = Number(sessionStorage.getItem(GOOGLE_REDIRECT_THROTTLE_KEY) || '0');
    return Number.isFinite(last) && Date.now() - last < GOOGLE_REDIRECT_THROTTLE_MS;
  } catch {
    return false;
  }
}

export function markGoogleRedirectAttempt(): void {
  try {
    sessionStorage.setItem(GOOGLE_REDIRECT_THROTTLE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function clearGoogleRedirectAttempt(): void {
  try {
    sessionStorage.removeItem(GOOGLE_REDIRECT_THROTTLE_KEY);
  } catch {
    // ignore
  }
}
