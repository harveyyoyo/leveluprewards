import { canonicalOfficeHost, isOfficeHostname } from '@/lib/officeRouting';
import { isLocalDevHost } from '@/lib/portalRouting';

export type OfficePublicSegment = '' | 'students' | 'classes' | 'grades' | 'billing' | 'reports';

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

/** Portal tile / admin links: handoff through API when subdomain is enabled. */
export function officePortalEntryHref(schoolId: string): string {
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
