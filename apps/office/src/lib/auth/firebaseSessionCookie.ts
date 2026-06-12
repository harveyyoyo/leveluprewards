/** HttpOnly cookie storing a Firebase Auth session JWT (minted server-side). */
export const FIREBASE_SESSION_COOKIE_NAME = 'fb_session';

function hasOfficeSubdomainConfigured(): boolean {
  return !!(
    process.env.OFFICE_CANONICAL_HOST?.trim() ||
    process.env.NEXT_PUBLIC_OFFICE_CANONICAL_HOST?.trim()
  );
}

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

/**
 * When true, POST /api/auth/session should mint the HttpOnly cookie.
 * Separate from edge enforcement: office subdomain handoff needs cookies even when middleware is relaxed.
 */
export function shouldMintFirebaseSessionCookie(): boolean {
  if (shouldEnforceFirebaseSessionEdge()) return true;
  if (hasOfficeSubdomainConfigured()) return true;
  return false;
}
