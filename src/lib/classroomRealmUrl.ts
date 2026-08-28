import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';

export type ClassroomRealmSegment = '' | 'setup' | 'manage' | 'live' | 'class-screen';

export const CLASSROOM_REALM_MANAGE_SECTIONS: readonly ClassroomTabSection[] = [
  'seating',
  'behavior',
  'room-display',
  'raffle',
];

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

/** Manage tabs (Class Awards Live, Behavior, Room display, Raffle). */
export function classroomRealmManageHref(
  schoolId: string,
  section: ClassroomTabSection = 'seating',
): string {
  const base = classroomRealmHref(schoolId, 'manage');
  return `${base}?section=${encodeURIComponent(section)}`;
}

export function parseClassroomRealmManageSection(
  value: string | null | undefined,
): ClassroomTabSection | undefined {
  const trimmed = (value || '').trim();
  if ((CLASSROOM_REALM_MANAGE_SECTIONS as readonly string[]).includes(trimmed)) {
    return trimmed as ClassroomTabSection;
  }
  return undefined;
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
