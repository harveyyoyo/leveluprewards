export type ClassroomRealmSegment = '' | 'setup' | 'manage' | 'live' | 'class-screen';

function classroomDevOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_CLASSROOM_DEV_ORIGIN?.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Public URL for the standalone Classroom experience.
 * Local dev can point at a separate origin via NEXT_PUBLIC_CLASSROOM_DEV_ORIGIN (future split app).
 */
export function classroomRealmHref(schoolId: string, segment: ClassroomRealmSegment = ''): string {
  const school = schoolId.trim().toLowerCase();
  const origin = classroomDevOrigin();
  const path = segment ? `/${school}/classroom-realm/${segment}` : `/${school}/classroom-realm`;
  if (origin) return `${origin}${path}`;
  return path;
}

/** Opens in a new tab — absolute URL when possible. */
export function classroomRealmOpenHref(schoolId: string, segment: ClassroomRealmSegment = ''): string {
  const href = classroomRealmHref(schoolId, segment);
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${href}`;
  }
  return href;
}

export function isClassroomRealmPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname.includes('/classroom-realm');
}
