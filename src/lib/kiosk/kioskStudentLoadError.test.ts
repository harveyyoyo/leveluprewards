import { OFFLINE_USER_MESSAGE } from '@/lib/errorMessage';
import {
  KIOSK_SCHOOL_CONNECTION_MESSAGE,
  isKioskSchoolConnectionError,
  kioskStudentLoadHelpText,
} from './kioskStudentLoadError';

describe('kioskStudentLoadHelpText', () => {
  it('prefers the reconnect result when that attempt failed', () => {
    expect(
      kioskStudentLoadHelpText({ code: 'unavailable' }, 'Could not reconnect this kiosk.'),
    ).toBe('Could not reconnect this kiosk.');
  });

  it('uses the school-connection message for permission failures', () => {
    expect(isKioskSchoolConnectionError({ code: 'permission-denied' })).toBe(true);
    expect(
      kioskStudentLoadHelpText({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }, null),
    ).toBe(KIOSK_SCHOOL_CONNECTION_MESSAGE);
  });

  it('uses the offline banner when the browser has no network', () => {
    const original = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    try {
      expect(kioskStudentLoadHelpText({ code: 'unavailable' }, null)).toBe(OFFLINE_USER_MESSAGE);
    } finally {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: original });
    }
  });

  it('uses the readable network hint for transient Firestore failures', () => {
    expect(kioskStudentLoadHelpText({ code: 'unavailable', message: 'unavailable' }, null)).toMatch(
      /connection|offline|server/i,
    );
  });
});
