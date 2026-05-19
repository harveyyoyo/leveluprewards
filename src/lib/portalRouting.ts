const RESERVED_PORTAL_SEGMENTS = new Set([
  'api',
  '_next',
  'portal',
  'login',
  'developer',
  'privacy',
  'terms',
  's',
  'level-up-arcade',
  'favicon.ico',
  'icon.png',
  'robots.txt',
  'manifest.json',
]);

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

function configuredPortalHosts(): Set<string> {
  const raw =
    process.env.PORTAL_HOSTNAMES ||
    process.env.NEXT_PUBLIC_PORTAL_HOSTNAMES ||
    '';

  return new Set(
    raw
      .split(',')
      .map((entry) => normalizeHost(entry))
      .filter(Boolean),
  );
}

export function canonicalPortalHost(): string {
  return normalizeHostWithPort(
    process.env.PORTAL_CANONICAL_HOST ||
      process.env.NEXT_PUBLIC_PORTAL_CANONICAL_HOST ||
      '',
  );
}

export function isPortalHostname(rawHost: string | null | undefined): boolean {
  const host = normalizeHost(rawHost);
  if (!host) return false;

  const configured = configuredPortalHosts();
  if (configured.has(host)) return true;

  return host === 'portal.localhost' || host.startsWith('portal.');
}

function isSchoolIdSegment(segment: string): boolean {
  const lower = segment.toLowerCase();
  return SCHOOL_ID_RE.test(segment) && !RESERVED_PORTAL_SEGMENTS.has(lower);
}

/** Local dev hosts should never be canonicalized away to production portal URLs. */
export function isLocalDevHost(rawHost: string | null | undefined): boolean {
  const host = normalizeHost(rawHost);
  if (!host) return false;
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '[::1]' ||
    host.startsWith('127.')
  );
}

export function portalHostRedirectPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/portal';

  const [first, second] = parts;
  const firstLower = first.toLowerCase();

  if (firstLower === 'portal' && parts.length === 2 && isSchoolIdSegment(second)) {
    return `/${second.toLowerCase()}/portal`;
  }

  if (parts.length === 1 && isSchoolIdSegment(first)) {
    return `/${first.toLowerCase()}/portal`;
  }

  return null;
}

export function canonicalPortalRedirectUrl(
  pathname: string,
  search: string,
  rawCurrentHost: string | null | undefined,
  protocol: string,
): URL | null {
  const targetHost = canonicalPortalHost();
  if (!targetHost) return null;
  if (isLocalDevHost(rawCurrentHost)) return null;
  if (normalizeHostWithPort(rawCurrentHost) === targetHost) return null;
  if (isPortalHostname(rawCurrentHost)) return null;

  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0] || '';
  const second = parts[1] || '';
  const firstIsSchool = isSchoolIdSegment(first);
  const isPortalEntry = pathname === '/portal' || pathname === '/login';
  const isSchoolPortal = firstIsSchool && second?.toLowerCase() === 'portal';

  if (!isPortalEntry && !isSchoolPortal) return null;

  const scheme = targetHost.includes('localhost') ? 'http:' : protocol || 'https:';
  const target = new URL(`${scheme}//${targetHost}${pathname}`);
  target.search = search || '';
  return target;
}
