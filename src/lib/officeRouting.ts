const RESERVED_OFFICE_SEGMENTS = new Set([
  'api',
  '_next',
  'login',
  'developer',
  'privacy',
  'terms',
  'portal',
  'office-bootstrap',
  'favicon.ico',
  'icon.png',
  'robots.txt',
  'manifest.json',
]);

/** Path segments on the office host (after /{schoolId}/). */
const OFFICE_PUBLIC_SEGMENTS = new Set(['students', 'classes', 'grades', 'attendance', 'front-desk', 'transportation', 'communication', 'teachers', 'billing', 'reports', 'settings']);

import {
  canonicalPortalHost,
  isLocalDevHost,
  isPortalHostname,
  portalHostForwardEnabled,
} from '@/lib/portalRouting';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;

function officeDevOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_OFFICE_DEV_ORIGIN?.trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`).origin;
  } catch {
    return null;
  }
}

function normalizeHost(rawHost: string | null | undefined): string {
  const host = (rawHost || '').trim().toLowerCase();
  if (!host) return '';
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end >= 0 ? host.slice(0, end + 1) : host;
  }
  return host.split(':')[0] || '';
}

function normalizeHostWithPort(rawHost: string | null | undefined): string {
  const host = (rawHost || '').trim().toLowerCase().replace(/^https?:\/\//i, '');
  if (!host) return '';
  return host.split('/')[0] || '';
}

function configuredOfficeHosts(): Set<string> {
  const raw =
    process.env.OFFICE_HOSTNAMES ||
    process.env.NEXT_PUBLIC_OFFICE_HOSTNAMES ||
    '';
  return new Set(
    raw
      .split(',')
      .map((entry) => normalizeHost(entry))
      .filter(Boolean),
  );
}

export function canonicalOfficeHost(): string {
  return normalizeHostWithPort(
    process.env.OFFICE_CANONICAL_HOST ||
      process.env.NEXT_PUBLIC_OFFICE_CANONICAL_HOST ||
      '',
  );
}

/** True for internal app routes under `/{schoolId}/office` (after office-host rewrites). */
export function isOfficeAppPath(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== 'string') return false;
  return /^\/[^/]+\/office(?:\/|$)/i.test(pathname);
}

/** Public office-host paths: `/{school}`, `/{school}/grades`, or legacy `/{school}/office/…`. */
export function isOfficeSchoolScopedPath(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== 'string') return false;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return false;
  if (!isSchoolIdSegment(parts[0])) return false;
  if (parts.length === 1) return true;
  const second = parts[1].toLowerCase();
  if (second === 'office') return true;
  return OFFICE_PUBLIC_SEGMENTS.has(second);
}

/**
 * Hide LevelUp global header / staff chrome (office has its own shell).
 * True on `office.*` host or any `/{school}/office` route.
 */
export function shouldHideGlobalAppChrome(
  pathname: string | null | undefined,
  host?: string | null,
): boolean {
  if (isOfficeAppPath(pathname)) return true;
  if (host && isOfficeHostname(host) && isOfficeSchoolScopedPath(pathname)) return true;
  return false;
}

/** Middleware / root layout: School Office should not show the LevelUp app header. */
export function isOfficeChromeRequest(
  pathname: string,
  rawHost: string | null | undefined,
): boolean {
  return shouldHideGlobalAppChrome(pathname, rawHost);
}

export const OFFICE_CHROME_REQUEST_HEADER = 'x-lvlup-office-chrome';

export function isOfficeHostname(rawHost: string | null | undefined): boolean {
  const host = normalizeHost(rawHost);
  if (!host) return false;

  const configured = configuredOfficeHosts();
  if (configured.has(host)) return true;

  return host === 'office.localhost' || host.startsWith('office.');
}

function isSchoolIdSegment(segment: string): boolean {
  const lower = segment.toLowerCase();
  return SCHOOL_ID_RE.test(segment) && !RESERVED_OFFICE_SEGMENTS.has(lower);
}

/**
 * On the office host, map public paths to internal `/{schoolId}/office/…` routes.
 * Returns null when no rewrite is needed.
 */
export function officeHostInternalRewritePath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const [first, second, ...rest] = parts;
  if (!isSchoolIdSegment(first)) return null;

  const school = first.toLowerCase();

  if (second?.toLowerCase() === 'office') {
    return null;
  }

  if (!second) {
    return `/${school}/office`;
  }

  if (OFFICE_PUBLIC_SEGMENTS.has(second.toLowerCase())) {
    const tail = rest.length ? `/${rest.join('/')}` : '';
    return `/${school}/office/${second.toLowerCase()}${tail}`;
  }

  return null;
}

/**
 * Redirect `/{school}/office/…` away from the main or portal host only when:
 * - optional office subdomain is configured (`OFFICE_CANONICAL_HOST`), or
 * - local dev split (`NEXT_PUBLIC_OFFICE_DEV_ORIGIN` on a local dev host).
 *
 * Production default: serve `/{school}/office/…` on the main site (no redirect).
 */
function officeRedirectTargetOrigin(
  protocol: string,
  rawCurrentHost: string | null | undefined,
): string | null {
  const targetHost = canonicalOfficeHost();
  if (targetHost && !isLocalDevHost(rawCurrentHost)) {
    const scheme = targetHost.includes('localhost') ? 'http:' : protocol || 'https:';
    return `${scheme}//${targetHost}`;
  }
  if (isLocalDevHost(rawCurrentHost)) {
    return officeDevOrigin();
  }
  return null;
}

export function canonicalOfficeRedirectUrl(
  pathname: string,
  search: string,
  rawCurrentHost: string | null | undefined,
  protocol: string,
): URL | null {
  if (isOfficeHostname(rawCurrentHost)) return null;

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const school = parts[0];
  if (!isSchoolIdSegment(school)) return null;
  if (parts[1].toLowerCase() !== 'office') return null;

  const targetOrigin = officeRedirectTargetOrigin(protocol, rawCurrentHost);
  if (!targetOrigin) return null;

  const publicTail = parts.slice(2).join('/');
  const devOrigin = officeDevOrigin();
  const usesOfficeAppRoutes = !!devOrigin && targetOrigin === devOrigin;
  const publicPath = usesOfficeAppRoutes
    ? publicTail
      ? `/${school.toLowerCase()}/office/${publicTail}`
      : `/${school.toLowerCase()}/office`
    : publicTail
      ? `/${school.toLowerCase()}/${publicTail}`
      : `/${school.toLowerCase()}`;
  const target = new URL(`${targetOrigin}${publicPath}`);
  target.search = search || '';
  return target;
}

/**
 * When the legacy office subdomain hits the rewards/portal app, send users to the
 * canonical portal host with `/{school}/office/…` paths (owner preference).
 */
export function officeHostToPortalRedirectUrl(
  pathname: string,
  search: string,
  rawCurrentHost: string | null | undefined,
  protocol: string,
): URL | null {
  if (!isOfficeHostname(rawCurrentHost)) return null;
  if (isLocalDevHost(rawCurrentHost)) return null;

  let portalHost = canonicalPortalHost();
  const officeHost = normalizeHost(rawCurrentHost);
  // Until old portal. links are switched to forward to the main site, old office links keep
  // landing on the portal. address they have used since the office subdomain was retired.
  const keepOldPortalHost =
    !portalHost || (!isPortalHostname(portalHost) && !portalHostForwardEnabled());
  if (keepOldPortalHost && officeHost.startsWith('office.')) {
    portalHost = `portal.${officeHost.slice('office.'.length)}`;
  }
  if (!portalHost) return null;

  let portalPath: string;
  if (pathname === '/' || pathname === '' || pathname === '/office-bootstrap') {
    portalPath = '/login';
  } else if (isOfficeAppPath(pathname)) {
    portalPath = pathname;
  } else {
    portalPath = officeHostInternalRewritePath(pathname) ?? pathname;
  }

  const scheme = portalHost.includes('localhost') ? 'http:' : protocol || 'https:';
  const target = new URL(`${scheme}//${portalHost}${portalPath}`);
  target.search = search || '';
  return target;
}

/** Office host root → School Office entry (school picker / session redirect). */
export function officeHostRedirectPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/office-bootstrap';

  // Rewards portal routes do not belong on the office subdomain.
  if (parts.length >= 2 && isSchoolIdSegment(parts[0]) && parts[1].toLowerCase() === 'portal') {
    return `/${parts[0].toLowerCase()}`;
  }

  // Legacy /{school}/office/… bookmarks on office host → clean public path.
  if (parts.length >= 2 && isSchoolIdSegment(parts[0]) && parts[1].toLowerCase() === 'office') {
    const school = parts[0].toLowerCase();
    const tail = parts.slice(2);
    return tail.length ? `/${school}/${tail.join('/')}` : `/${school}`;
  }

  return null;
}
