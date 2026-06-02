import {
  isOfficeAppPath,
  isOfficeHostname,
  isOfficeSchoolScopedPath,
} from '@/lib/officeRouting';
import { officePublicHref, type OfficePublicSegment } from '@/lib/officePublicUrl';
import { canonicalPortalHost, isLocalDevHost } from '@/lib/portalRouting';

const OFFICE_PUBLIC_SEGMENTS = new Set<OfficePublicSegment>([
  'students',
  'classes',
  'teachers',
  'grades',
  'billing',
  'reports',
  'settings',
]);

function isOfficeLoginSurface(pathname: string): boolean {
  if (typeof window !== 'undefined' && isOfficeHostname(window.location.host)) {
    return isOfficeSchoolScopedPath(pathname);
  }
  return isOfficeAppPath(pathname);
}

function officeSegmentFromPathname(schoolId: string, pathname: string): OfficePublicSegment | '' {
  const route = schoolId.trim().toLowerCase();
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0]?.toLowerCase() !== route) return '';

  if (typeof window !== 'undefined' && isOfficeHostname(window.location.host)) {
    const publicSeg = parts[1]?.toLowerCase();
    if (!publicSeg) return '';
    return OFFICE_PUBLIC_SEGMENTS.has(publicSeg as OfficePublicSegment)
      ? (publicSeg as OfficePublicSegment)
      : '';
  }

  if (parts[1]?.toLowerCase() !== 'office') return '';
  const legacySeg = parts[2]?.toLowerCase();
  if (!legacySeg) return '';
  return OFFICE_PUBLIC_SEGMENTS.has(legacySeg as OfficePublicSegment)
    ? (legacySeg as OfficePublicSegment)
    : '';
}

/**
 * Post-login destination for `/login?school=&next=` when the user started on School Office.
 * Uses absolute office URLs when the office subdomain is configured so portal login returns
 * to office instead of `portal.example.com/{school}/portal`.
 */
export function schoolLoginNextPath(schoolId: string, pathname: string): string {
  const route = schoolId.trim().toLowerCase();
  if (isOfficeLoginSurface(pathname)) {
    const segment = officeSegmentFromPathname(route, pathname);
    return officePublicHref(route, segment);
  }
  if (pathname.startsWith(`/${route}/`) || pathname === `/${route}`) {
    return pathname;
  }
  return `/${route}`;
}

/**
 * School sign-in URL for client redirects. On the office host, targets canonical portal login
 * with an office-safe absolute `next` URL (matches edge middleware behaviour).
 */
export function schoolLoginRedirectHref(
  schoolId: string,
  options?: { pathname?: string; changeSchool?: boolean },
): string {
  const route = schoolId.trim().toLowerCase();
  const pathname =
    options?.pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : `/${route}`);
  const params = new URLSearchParams({ school: route });
  if (options?.changeSchool) params.set('changeSchool', '1');

  const next = schoolLoginNextPath(route, pathname);
  if (next) params.set('next', next);

  const onOffice =
    typeof window !== 'undefined' && isOfficeHostname(window.location.host);
  const portalHost = canonicalPortalHost();
  const usePortalLogin =
    onOffice && portalHost && !isLocalDevHost(window.location.host);

  if (usePortalLogin) {
    const scheme = portalHost.includes('localhost') ? 'http' : 'https';
    return `${scheme}://${portalHost}/login?${params.toString()}`;
  }

  return `/login?${params.toString()}`;
}

/** Rewards portal staff route (portal host when configured). */
export function schoolStaffPortalHref(schoolId: string, section: string): string {
  const school = schoolId.trim().toLowerCase();
  const segment = section.replace(/^\/+/, '');
  const portalHost = canonicalPortalHost();
  if (
    portalHost &&
    typeof window !== 'undefined' &&
    isOfficeHostname(window.location.host) &&
    !isLocalDevHost(window.location.host)
  ) {
    const scheme = portalHost.includes('localhost') ? 'http' : 'https';
    return `${scheme}://${portalHost}/${school}/${segment}`;
  }
  return `/${school}/${segment}`;
}

export function isOfficeClientSurface(pathname: string): boolean {
  return isOfficeLoginSurface(pathname);
}
