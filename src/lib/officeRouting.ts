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
const OFFICE_PUBLIC_SEGMENTS = new Set(['students', 'classes', 'grades', 'billing', 'reports']);

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;

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
 * Redirect `/{school}/office/…` on the main or portal host to the office subdomain.
 */
export function canonicalOfficeRedirectUrl(
  pathname: string,
  search: string,
  rawCurrentHost: string | null | undefined,
  protocol: string,
): URL | null {
  const targetHost = canonicalOfficeHost();
  if (!targetHost) return null;
  if (isOfficeHostname(rawCurrentHost)) return null;

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const school = parts[0];
  if (!isSchoolIdSegment(school)) return null;
  if (parts[1].toLowerCase() !== 'office') return null;

  const scheme = targetHost.includes('localhost') ? 'http:' : protocol || 'https:';
  const publicTail = parts.slice(2).join('/');
  const publicPath = publicTail ? `/${school.toLowerCase()}/${publicTail}` : `/${school.toLowerCase()}`;
  const target = new URL(`${scheme}//${targetHost}${publicPath}`);
  target.search = search || '';
  return target;
}

/** Office host root → portal entry. */
export function officeHostPortalRedirectUrl(
  pathname: string,
  rawCurrentHost: string | null | undefined,
  protocol: string,
): URL | null {
  if (!isOfficeHostname(rawCurrentHost)) return null;
  if (pathname !== '/' && pathname !== '') return null;

  const portalHost =
    process.env.PORTAL_CANONICAL_HOST ||
    process.env.NEXT_PUBLIC_PORTAL_CANONICAL_HOST ||
    '';
  if (!portalHost.trim()) return null;

  const scheme = portalHost.includes('localhost') ? 'http:' : protocol || 'https:';
  return new URL(`${scheme}//${normalizeHostWithPort(portalHost)}/portal`);
}
