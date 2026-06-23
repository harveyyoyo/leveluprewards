export type HousesRealmSegment = '' | 'setup' | 'manage' | 'ceremony' | 'hall-of-fame';

function housesDevOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_HOUSES_DEV_ORIGIN?.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Public URL for the standalone Houses experience.
 * Local dev can point at a separate origin via NEXT_PUBLIC_HOUSES_DEV_ORIGIN (future split app).
 */
export function housesRealmHref(schoolId: string, segment: HousesRealmSegment = ''): string {
  const school = schoolId.trim().toLowerCase();
  const origin = housesDevOrigin();
  const path = segment ? `/${school}/houses-realm/${segment}` : `/${school}/houses-realm`;
  if (origin) return `${origin}${path}`;
  return path;
}

/** Opens in a new tab — absolute URL when possible. */
export function housesRealmOpenHref(schoolId: string, segment: HousesRealmSegment = ''): string {
  const href = housesRealmHref(schoolId, segment);
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${href}`;
  }
  return href;
}

export function isHousesRealmPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname.includes('/houses-realm');
}
