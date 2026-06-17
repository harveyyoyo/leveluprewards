const RESERVED_SSS_SEGMENTS = new Set([
  'api',
  '_next',
  'login',
  'developer',
  'privacy',
  'terms',
  'portal',
  'office-bootstrap',
  'sss-bootstrap',
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

function configuredSssHosts(): Set<string> {
  const raw = process.env.SSS_HOSTNAMES || process.env.NEXT_PUBLIC_SSS_HOSTNAMES || '';
  return new Set(raw.split(',').map((entry) => normalizeHost(entry)).filter(Boolean));
}

export function canonicalSssHost(): string {
  return normalizeHostWithPort(
    process.env.SSS_CANONICAL_HOST || process.env.NEXT_PUBLIC_SSS_CANONICAL_HOST || '',
  );
}

export function isSssAppPath(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== 'string') return false;
  return /^\/[^/]+\/sss(?:\/|$)/i.test(pathname);
}

export function isSssSchoolScopedPath(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== 'string') return false;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return false;
  if (!isSchoolIdSegment(parts[0])) return false;
  return parts.length === 1 || parts[1].toLowerCase() === 'sss';
}

export function shouldHideGlobalAppChromeForSss(
  pathname: string | null | undefined,
  host?: string | null,
): boolean {
  if (isSssAppPath(pathname)) return true;
  if (host && isSssHostname(host) && isSssSchoolScopedPath(pathname)) return true;
  return false;
}

export const SSS_CHROME_REQUEST_HEADER = 'x-lvlup-sss-chrome';

export function isSssChromeRequest(pathname: string, rawHost: string | null | undefined): boolean {
  return shouldHideGlobalAppChromeForSss(pathname, rawHost);
}

export function isSssHostname(rawHost: string | null | undefined): boolean {
  const host = normalizeHost(rawHost);
  if (!host) return false;
  if (configuredSssHosts().has(host)) return true;
  return host === 'sss.localhost' || host.startsWith('sss.');
}

function isSchoolIdSegment(segment: string): boolean {
  const lower = segment.toLowerCase();
  return SCHOOL_ID_RE.test(segment) && !RESERVED_SSS_SEGMENTS.has(lower);
}

export function sssHostInternalRewritePath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const [first, second] = parts;
  if (!isSchoolIdSegment(first)) return null;
  const school = first.toLowerCase();
  if (second?.toLowerCase() === 'sss') return null;
  if (!second) return `/${school}/sss`;
  return null;
}

export function canonicalSssRedirectUrl(
  pathname: string,
  search: string,
  rawCurrentHost: string | null | undefined,
  protocol: string,
): URL | null {
  const targetHost = canonicalSssHost();
  if (!targetHost) return null;
  if (isSssHostname(rawCurrentHost)) return null;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const school = parts[0];
  if (!isSchoolIdSegment(school)) return null;
  if (parts[1].toLowerCase() !== 'sss') return null;
  const scheme = targetHost.includes('localhost') ? 'http:' : protocol || 'https:';
  const target = new URL(`${scheme}//${targetHost}/${school.toLowerCase()}`);
  target.search = search || '';
  return target;
}

export function sssHostRedirectPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/sss-bootstrap';
  if (parts.length >= 2 && isSchoolIdSegment(parts[0]) && parts[1].toLowerCase() === 'portal') {
    return `/${parts[0].toLowerCase()}`;
  }
  return null;
}
