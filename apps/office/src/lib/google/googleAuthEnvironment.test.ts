import { afterEach, describe, expect, it } from 'vitest';
import {
  canUseGoogleRedirectSignIn,
  consumeGoogleRedirectFailedNotice,
  isGoogleRedirectStateLostError,
  isInAppBrowser,
  isSessionStorageAvailable,
  markGoogleRedirectFailedNotice,
} from '@/lib/google/googleAuthEnvironment';

describe('googleAuthEnvironment', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('detects Firebase missing redirect state errors', () => {
    expect(
      isGoogleRedirectStateLostError(
        new Error(
          'Unable to process request due to missing initial state. This may happen if browser sessionStorage is inaccessible or accidentally cleared.',
        ),
      ),
    ).toBe(true);
    expect(isGoogleRedirectStateLostError({ code: 'auth/redirect-state-mismatch' })).toBe(true);
    expect(isGoogleRedirectStateLostError(new Error('popup blocked'))).toBe(false);
  });

  it('reports sessionStorage availability', () => {
    expect(isSessionStorageAvailable()).toBe(true);
  });

  it('tracks one-time redirect failure notices', () => {
    markGoogleRedirectFailedNotice();
    expect(consumeGoogleRedirectFailedNotice()).toBe(true);
    expect(consumeGoogleRedirectFailedNotice()).toBe(false);
  });

  it('blocks redirect sign-in in in-app browsers', () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 Instagram 123',
    });
    try {
      expect(isInAppBrowser()).toBe(true);
      expect(canUseGoogleRedirectSignIn()).toBe(false);
    } finally {
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value: original,
      });
    }
  });
});
