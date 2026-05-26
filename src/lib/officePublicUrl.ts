import { canonicalOfficeHost, isOfficeHostname } from '@/lib/officeRouting';
import { canonicalPortalHost, isLocalDevHost, isPortalHostname } from '@/lib/portalRouting';

export type OfficePublicSegment =
  | ''
  | 'students'
  | 'classes'
  | 'teachers'
  | 'grades'
  | 'billing'
  | 'reports'
  | 'settings';

function officeCanonicalOrigin(): string | null {
  const host = canonicalOfficeHost();
  if (!host) return null;
  if (typeof window !== 'undefined') {
    if (isLocalDevHost(window.location.host) && !isOfficeHostname(window.location.host)) {
      return null;
    }
  }
  const scheme = host.includes('localhost') ? 'http' : 'https';
  return `${scheme}://${host}`;
}

/** True when office subdomain URLs should be used (env configured or current host is office.*). */
export function useOfficeSubdomainUrls(): boolean {
  if (typeof window !== 'undefined') {
    return isOfficeHostname(window.location.host) || !!officeCanonicalOrigin();
  }
  return !!officeCanonicalOrigin();
}

/**
 * Public URL for School Office (subdomain when configured, otherwise legacy path).
 */
export function officePublicHref(schoolId: string, segment: OfficePublicSegment = ''): string {
  const school = schoolId.trim().toLowerCase();
  const origin = officeCanonicalOrigin();
  if (origin) {
    return segment ? `${origin}/${school}/${segment}` : `${origin}/${school}`;
  }
  return segment ? `/${school}/office/${segment}` : `/${school}/office`;
}

/** User-facing School Office link (public URL, not the handoff API). */
export function officePortalEntryHref(schoolId: string): string {
  return officePublicHref(schoolId);
}

/** Portal/admin → office session handoff (API on the current app host when subdomain is enabled). */
export function officePortalHandoffHref(schoolId: string): string {
  if (!officeCanonicalOrigin()) {
    return officePublicHref(schoolId);
  }
  const school = schoolId.trim().toLowerCase();
  return `/api/auth/office-handoff/redirect?school=${encodeURIComponent(school)}`;
}

/** Staff portal sign-in landing for School Office (handoff or legacy path). */
export function officeStaffEntryHref(schoolId: string): string {
  return officePortalEntryHref(schoolId);
}

function portalCanonicalOrigin(): string | null {
  const host = canonicalPortalHost();
  if (!host) return null;
  if (typeof window !== 'undefined') {
    if (isLocalDevHost(window.location.host) && !isPortalHostname(window.location.host)) {
      return null;
    }
  }
  const scheme = host.includes('localhost') ? 'http' : 'https';
  return `${scheme}://${host}`;
}

/** Main school portal URL (canonical portal host when configured). */
export function schoolPortalHref(schoolId: string): string {
  const school = schoolId.trim().toLowerCase();
  const origin = portalCanonicalOrigin();
  if (origin) return `${origin}/${school}/portal`;
  return `/${school}/portal`;
}

/**
 * Absolute URL for copy/share — safe when `officePublicHref` already returns a full URL on office subdomain.
 */
export function officeAbsoluteHref(schoolId: string, segment: OfficePublicSegment = ''): string {
  const href = officePublicHref(schoolId, segment);
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${href.startsWith('/') ? href : `/${href}`}`;
  }
  return href;
}
