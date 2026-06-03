import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { sanitizeInternalNextPath } from '@/lib/auth/internalNextRedirect';
import {
  isOfficeAppPath,
  isOfficeHostname,
  isOfficeSchoolScopedPath,
} from '@/lib/officeRouting';
import { officePublicHref, type OfficePublicSegment } from '@/lib/officePublicUrl';
import { canonicalPortalHost, isLocalDevHost } from '@/lib/portalRouting';

export const SCHOOL_LOGIN_OFFICE_INTENT_KEY = 'lvlup:schoolLoginOfficeIntent';
/** Query flag set when edge middleware sends users from the office host to portal login. */
export const SCHOOL_LOGIN_OFFICE_INTENT_PARAM = 'office';

export function hasUrlSchoolLoginOfficeIntent(
  params: URLSearchParams | null | undefined,
): boolean {
  return params?.get(SCHOOL_LOGIN_OFFICE_INTENT_PARAM) === '1';
}

export function markSchoolLoginOfficeIntent(schoolId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SCHOOL_LOGIN_OFFICE_INTENT_KEY, schoolId.trim().toLowerCase());
  } catch {
    // ignore
  }
}

export function consumeSchoolLoginOfficeIntent(schoolId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const expected = schoolId.trim().toLowerCase();
    const stored = sessionStorage.getItem(SCHOOL_LOGIN_OFFICE_INTENT_KEY);
    sessionStorage.removeItem(SCHOOL_LOGIN_OFFICE_INTENT_KEY);
    return stored === expected;
  } catch {
    return false;
  }
}

/** Client navigations must hard-assign cross-origin URLs (Next router only handles same-origin). */
export function followAppRedirect(href: string, router: AppRouterInstance): void {
  if (typeof window === 'undefined') return;

  if (/^https?:\/\//i.test(href)) {
    try {
      const target = new URL(href);
      if (target.origin !== window.location.origin) {
        window.location.assign(href);
        return;
      }
      router.replace(`${target.pathname}${target.search}${target.hash}`);
      return;
    } catch {
      window.location.assign(href);
      return;
    }
  }

  router.replace(href);
}

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

  if (onOffice) {
    markSchoolLoginOfficeIntent(route);
    params.set(SCHOOL_LOGIN_OFFICE_INTENT_PARAM, '1');
  }

  if (usePortalLogin) {
    const scheme = portalHost.includes('localhost') ? 'http' : 'https';
    return `${scheme}://${portalHost}/login?${params.toString()}`;
  }

  return `/login?${params.toString()}`;
}

/**
 * Post-login destination after school passcode sign-in (`/login?school=&next=`).
 * Prefers a validated `next`, then office intent, then the rewards portal default.
 */
export function resolveSchoolLoginNextUrl(
  schoolId: string,
  options?: { search?: string; pathname?: string },
): string {
  const sid = schoolId.trim().toLowerCase();
  const defaultPortal = `/${sid}/portal`;

  if (typeof window === 'undefined') return defaultPortal;

  const params = new URLSearchParams(options?.search ?? window.location.search);
  const nextParam = params.get('next');
  const officeIntent =
    hasUrlSchoolLoginOfficeIntent(params) ||
    consumeSchoolLoginOfficeIntent(sid) ||
    isOfficeHostname(window.location.host);

  if (nextParam) {
    const target = sanitizeInternalNextPath(nextParam, sid);
    if (target) return target;
    if (officeIntent) return officePublicHref(sid);
    return defaultPortal;
  }

  if (officeIntent) return officePublicHref(sid);

  const pathname = options?.pathname ?? window.location.pathname;
  const officeNext = schoolLoginNextPath(sid, pathname);
  if (officeNext.startsWith('http://') || officeNext.startsWith('https://')) {
    return officeNext;
  }

  return defaultPortal;
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
