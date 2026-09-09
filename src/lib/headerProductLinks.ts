import { classroomRealmHref } from '@/lib/classroomRealmUrl';
import { staffPortalRoleFromLoginState } from '@/lib/staffPortal/navLayout';

export const HEADER_PRODUCT_IDS = [
  'rewards',
  'classroom',
  'attendance',
  'homework',
  'library',
] as const;

export type HeaderProductId = (typeof HEADER_PRODUCT_IDS)[number];

function schoolRoot(schoolId: string): string {
  return `/${schoolId.trim().toLowerCase()}`;
}

function staffPortalTabHref(schoolId: string, loginState: string, tab: string): string {
  const role = staffPortalRoleFromLoginState(loginState);
  const root = schoolRoot(schoolId);
  if (role === 'teacher' || role === 'secretary') {
    return `${root}/teacher?tab=${encodeURIComponent(tab)}`;
  }
  return `${root}/admin?tab=${encodeURIComponent(tab)}`;
}

/** Destination for a header product pill, based on who is signed in. */
export function headerProductHref(
  product: HeaderProductId,
  schoolId: string,
  loginState: string,
): string {
  const school = schoolId.trim().toLowerCase();
  if (!school) return '';
  const root = schoolRoot(school);

  switch (product) {
    case 'rewards':
      if (loginState === 'student') return `${root}/student`;
      if (loginState === 'secretary') return `${root}/secretary`;
      if (staffPortalRoleFromLoginState(loginState)) {
        return staffPortalTabHref(school, loginState, 'prizes');
      }
      return `${root}/portal`;
    case 'classroom':
      return classroomRealmHref(school);
    case 'attendance':
      return staffPortalTabHref(school, loginState, 'attendance');
    case 'homework':
      return `${root}/teacher?tab=homework`;
    case 'library':
      if (loginState === 'librarian') return `${root}/librarian`;
      return `${root}/library`;
  }
}
