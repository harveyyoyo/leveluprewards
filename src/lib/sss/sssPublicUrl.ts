import { canonicalSssHost, isSssHostname } from '@/lib/sss/sssRouting';
import { canonicalPortalHost, isLocalDevHost, isPortalHostname } from '@/lib/portalRouting';

function sssCanonicalOrigin(): string | null {
  const host = canonicalSssHost();
  if (!host) return null;
  if (typeof window !== 'undefined') {
    if (isLocalDevHost(window.location.host) && !isSssHostname(window.location.host)) {
      return null;
    }
  }
  const scheme = host.includes('localhost') ? 'http' : 'https';
  return `${scheme}://${host}`;
}

export function sssPublicHref(schoolId: string): string {
  const school = schoolId.trim().toLowerCase();
  const origin = sssCanonicalOrigin();
  if (origin) return `${origin}/${school}`;
  if (typeof window !== 'undefined' && isSssHostname(window.location.host)) {
    return `/${school}`;
  }
  return `/${school}/sss`;
}

export function schoolPortalHref(schoolId: string): string {
  const school = schoolId.trim().toLowerCase();
  const host = canonicalPortalHost();
  if (!host) return `/${school}/portal`;
  if (typeof window !== 'undefined') {
    if (isLocalDevHost(window.location.host) && !isPortalHostname(window.location.host)) {
      return `/${school}/portal`;
    }
  }
  const scheme = host.includes('localhost') ? 'http' : 'https';
  return `${scheme}://${host}/${school}/portal`;
}
