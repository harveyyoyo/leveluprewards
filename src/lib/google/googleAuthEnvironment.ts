const GOOGLE_REDIRECT_FAILED_NOTICE_KEY = 'levelup:googleRedirectFailedNotice';

/** Firebase Auth error when redirect OAuth state was lost (common on mobile / in-app browsers). */
export function isGoogleRedirectStateLostError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? '').toLowerCase();
  const code = String((error as { code?: string })?.code ?? '').toLowerCase();
  return (
    message.includes('missing initial state') ||
    code === 'auth/redirect-state-mismatch' ||
    code === 'auth/redirect-cancelled-by-user'
  );
}

/** True when sessionStorage can be written and read in this browsing context. */
export function isSessionStorageAvailable(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    const probeKey = '__levelup_session_probe__';
    sessionStorage.setItem(probeKey, '1');
    const ok = sessionStorage.getItem(probeKey) === '1';
    sessionStorage.removeItem(probeKey);
    return ok;
  } catch {
    return false;
  }
}

/** Embedded / in-app browsers often break Firebase redirect sign-in. */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /(FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|Snapchat|GSA\/|DuckDuckGo|MicroMessenger|wv\))/i.test(
    ua,
  );
}

/** Redirect OAuth is unreliable when storage is blocked or the page runs inside an in-app webview. */
export function canUseGoogleRedirectSignIn(): boolean {
  return isSessionStorageAvailable() && !isInAppBrowser();
}

export function googleRedirectRecoveryHint(): string {
  if (isInAppBrowser()) {
    return 'Open this page in Safari or Chrome (use “Open in browser” from the app menu), then try Google sign-in again.';
  }
  if (!isSessionStorageAvailable()) {
    return 'This browser blocked temporary sign-in storage. Turn off private browsing or try Safari/Chrome, then sign in again.';
  }
  return 'Google sign-in was interrupted. Close extra tabs for this site, wait a moment, and try again.';
}

export function markGoogleRedirectFailedNotice(): void {
  try {
    sessionStorage.setItem(GOOGLE_REDIRECT_FAILED_NOTICE_KEY, '1');
  } catch {
    // ignore
  }
}

export function consumeGoogleRedirectFailedNotice(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    const pending = sessionStorage.getItem(GOOGLE_REDIRECT_FAILED_NOTICE_KEY) === '1';
    if (pending) sessionStorage.removeItem(GOOGLE_REDIRECT_FAILED_NOTICE_KEY);
    return pending;
  } catch {
    return false;
  }
}

/** Remove stale Firebase OAuth query/hash params after a failed redirect return. */
export function scrubFirebaseAuthRedirectParams(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const authParams = [
      'apiKey',
      'appName',
      'authType',
      'redirectUrl',
      'sessionId',
      'code',
      'state',
      'scope',
      'oauth_token',
      'oauth_verifier',
      'providerId',
    ];
    let changed = false;
    for (const key of authParams) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (url.hash && /(apiKey=|authType=|sessionId=)/.test(url.hash)) {
      url.hash = '';
      changed = true;
    }
    if (changed) {
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, document.title, next);
    }
  } catch {
    // ignore
  }
}
