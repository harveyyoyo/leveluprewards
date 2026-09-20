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

function withOrigin(path: string): string {
  const origin = classroomDevOrigin();
  if (origin) return `${origin}${path}`;
  return path;
}

/** Canonical Classroom page (the live teaching board). */
export function classroomHref(
  schoolId: string,
  query?: { audience?: 'student'; classId?: string; scope?: string },
): string {
  const school = schoolId.trim().toLowerCase();
  const params = new URLSearchParams();
  if (query?.classId) params.set('classId', query.classId);
  if (query?.scope) params.set('scope', query.scope);
  if (query?.audience === 'student') params.set('audience', 'student');
  const q = params.toString();
  return withOrigin(`/${school}/classroom${q ? `?${q}` : ''}`);
}

/**
 * Public URL for Classroom.
 * Hub / manage / setup / live all open the live Classroom page.
 * Class screen opens the same page in student view.
 */
export function classroomRealmHref(schoolId: string, segment: ClassroomRealmSegment = ''): string {
  if (segment === 'class-screen') {
    return classroomHref(schoolId, { audience: 'student' });
  }
  return classroomHref(schoolId);
}

/** Manage tabs now live on Classroom live tools — keep the helper so old links compile. */
export function classroomRealmManageHref(
  schoolId: string,
  _section: ClassroomTabSection = 'seating',
): string {
  return classroomHref(schoolId);
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
  return pathname.includes('/classroom-realm') || /\/classroom(?:\/|$)/.test(pathname);
}

export function classroomPortalHomeHref(schoolId: string): string {
  const school = schoolId.trim().toLowerCase();
  return `/${school}/portal`;
}
