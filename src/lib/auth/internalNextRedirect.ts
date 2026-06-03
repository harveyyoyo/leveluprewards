import { canonicalOfficeHost } from '@/lib/officeRouting';
import { canonicalPortalHost } from '@/lib/portalRouting';

function normalizeRedirectHostname(rawHost: string): string {
  const host = rawHost.trim().toLowerCase();
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end >= 0 ? host.slice(0, end + 1) : host;
  }
  return host.split(':')[0] || '';
}

/** Hostnames allowed for absolute `next` URLs after school login. */
export function isTrustedRedirectHostname(rawHost: string): boolean {
  const host = normalizeRedirectHostname(rawHost);
  if (!host) return false;

  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1') {
    return true;
  }

  if (
    host === 'leveluprewards.app' ||
    host.endsWith('.leveluprewards.app') ||
    host === 'leveluprewards.com' ||
    host.endsWith('.leveluprewards.com')
  ) {
    return true;
  }

  for (const configured of [canonicalOfficeHost(), canonicalPortalHost()]) {
    const normalized = normalizeRedirectHostname(configured);
    if (!normalized) continue;
    if (host === normalized || host.endsWith(`.${normalized}`)) return true;
  }

  return false;
}

/**
 * Validates `next` from /login?school=&next= so we never open-redirect off-site.
 * Requires the first path segment to match the school id from the login flow.
 * Supports absolute URLs for allowed subdomains/domains (e.g. office.leveluprewards.app)
 */
export function sanitizeInternalNextPath(next: string, schoolId: string): string | null {
  let decoded = next;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return null;
  }

  let urlPathname = decoded;
  let isAbsolute = false;
  let absoluteUrlString = '';

  if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
    try {
      const parsed = new URL(decoded);
      const host = parsed.hostname.toLowerCase();

      if (!isTrustedRedirectHostname(host)) {
        return null;
      }
      
      urlPathname = parsed.pathname;
      isAbsolute = true;
      absoluteUrlString = decoded;
    } catch {
      return null;
    }
  }

  if (!urlPathname.startsWith('/') || urlPathname.startsWith('//')) return null;
  if (urlPathname.includes('..')) return null;

  const [pathOnly, restQs] = urlPathname.split('?');
  const segments = pathOnly.split('/').filter(Boolean);
  const first = segments[0]?.trim().toLowerCase() || '';
  const sid = schoolId.trim().toLowerCase();
  
  if (!sid || first !== sid) return null;
  if (segments.length < 1) return null;

  const reserved = new Set(['login', 'developer', 'api', 's', 'privacy', 'terms']);
  if (reserved.has(first)) return null;

  if (pathOnly === '/login' || pathOnly.toLowerCase().endsWith('/login')) return null;

  if (isAbsolute) {
    return absoluteUrlString;
  }

  return restQs !== undefined ? `${pathOnly}?${restQs}` : pathOnly;
}
