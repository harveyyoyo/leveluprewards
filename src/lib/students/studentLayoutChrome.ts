/** Sync signed-in student UI with root layout (hide global header on post-sign-in surfaces). */

export const STUDENT_KIOSK_SIGNED_IN_ATTR = 'data-student-kiosk-signed-in';
export const STUDENT_PORTAL_SIGNED_IN_ATTR = 'data-student-portal-signed-in';
export const STUDENT_LAYOUT_CHROME_EVENT = 'student-layout-chrome-change';

function dispatchChromeChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STUDENT_LAYOUT_CHROME_EVENT));
  }
}

export function setStudentKioskSignedIn(active: boolean) {
  if (typeof document === 'undefined') return;
  if (active) {
    document.documentElement.setAttribute(STUDENT_KIOSK_SIGNED_IN_ATTR, '');
  } else {
    document.documentElement.removeAttribute(STUDENT_KIOSK_SIGNED_IN_ATTR);
  }
  dispatchChromeChange();
}

export function setStudentPortalSignedIn(active: boolean) {
  if (typeof document === 'undefined') return;
  if (active) {
    document.documentElement.setAttribute(STUDENT_PORTAL_SIGNED_IN_ATTR, '');
  } else {
    document.documentElement.removeAttribute(STUDENT_PORTAL_SIGNED_IN_ATTR);
  }
  dispatchChromeChange();
}

export function readStudentLayoutChromeFlags(): { kioskSignedIn: boolean; portalSignedIn: boolean } {
  if (typeof document === 'undefined') {
    return { kioskSignedIn: false, portalSignedIn: false };
  }
  return {
    kioskSignedIn: document.documentElement.hasAttribute(STUDENT_KIOSK_SIGNED_IN_ATTR),
    portalSignedIn: document.documentElement.hasAttribute(STUDENT_PORTAL_SIGNED_IN_ATTR),
  };
}
