/** HttpOnly cookie storing a Firebase Auth session JWT (minted server-side). */
export const FIREBASE_SESSION_COOKIE_NAME = 'fb_session';

/**
 * When true, school-scoped HTML routes require a valid Firebase session cookie.
 * Default: on in production, off in development (local dev often lacks Admin ADC).
 * Set AUTH_SESSION_EDGE_ENFORCEMENT=1 to test locally; DISABLE_AUTH_SESSION_EDGE=1 to disable in prod.
 */
export function shouldEnforceFirebaseSessionEdge(): boolean {
  if (process.env.DISABLE_AUTH_SESSION_EDGE === '1') return false;
  if (process.env.AUTH_SESSION_EDGE_ENFORCEMENT === '1') return true;
  return process.env.NODE_ENV === 'production';
}
