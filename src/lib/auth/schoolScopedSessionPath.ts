/** First path segment is never a school id for these roots. */
const RESERVED_FIRST = new Set([
  'login',
  'api',
  'developer',
  's',
  'privacy',
  'terms',
  'level-up-arcade',
  'flyers',
  'promotions',
  '_next',
  'favicon.ico',
  'icon.png',
  'robots.txt',
  'manifest.json',
]);

/** School hub routes that require a Firebase session cookie when edge enforcement is on. */
const PROTECTED_SECOND = new Set([
  'portal',
  'student',
  'student-home',
  'teacher',
  'admin',
  'admin-sign-in',
  'prize',
  'secretary',
  'prize-clerk',
  'reports',
  'hall-of-fame',
  'bulletin-board',
  'office',
]);

/** Allowed without session cookie (server redirect or legacy). */
const PUBLIC_SECOND = new Set(['sign-in']);

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;

/**
 * Returns `{ schoolId }` when the URL is a gated `/{schoolId}/(protected)/…` route.
 */
export function parseSchoolScopedSessionPath(pathname: string): { schoolId: string } | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const rawSchool = parts[0];
  const first = rawSchool.toLowerCase();
  if (RESERVED_FIRST.has(first)) return null;
  if (!SCHOOL_ID_RE.test(rawSchool)) return null;
  const second = parts[1].toLowerCase();
  if (PUBLIC_SECOND.has(second)) return null;
  if (!PROTECTED_SECOND.has(second)) return null;
  return { schoolId: rawSchool };
}
