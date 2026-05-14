/**
 * Validates `next` from /login?school=&next= so we never open-redirect off-site.
 * Requires the first path segment to match the school id from the login flow.
 */
export function sanitizeInternalNextPath(next: string, schoolId: string): string | null {
  let decoded = next;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return null;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null;
  if (decoded.includes('..')) return null;

  const [pathOnly, restQs] = decoded.split('?');
  const segments = pathOnly.split('/').filter(Boolean);
  const first = segments[0]?.trim().toLowerCase() || '';
  const sid = schoolId.trim().toLowerCase();
  if (!sid || first !== sid) return null;
  if (segments.length < 2) return null;

  const reserved = new Set(['login', 'developer', 'api', 's', 'privacy', 'terms']);
  if (reserved.has(first)) return null;

  if (pathOnly === '/login' || pathOnly.toLowerCase().endsWith('/login')) return null;

  return restQs !== undefined ? `${pathOnly}?${restQs}` : pathOnly;
}
