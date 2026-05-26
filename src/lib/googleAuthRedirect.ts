/** Set before Google redirect sign-in so bootstrap waits for credentials before anonymous auth. */
export const PENDING_DEVELOPER_LOGIN_KEY = 'levelup:pendingDeveloperLogin';

const GOOGLE_REDIRECT_THROTTLE_KEY = 'levelup:googleRedirectAttemptAt';
const GOOGLE_REDIRECT_THROTTLE_MS = 15_000;

export function hasPendingDeveloperGoogleRedirect(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(PENDING_DEVELOPER_LOGIN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markPendingDeveloperGoogleRedirect(): void {
  try {
    sessionStorage.setItem(PENDING_DEVELOPER_LOGIN_KEY, 'true');
  } catch {
    // ignore
  }
}

export function clearPendingDeveloperGoogleRedirect(): void {
  try {
    sessionStorage.removeItem(PENDING_DEVELOPER_LOGIN_KEY);
  } catch {
    // ignore
  }
}

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
