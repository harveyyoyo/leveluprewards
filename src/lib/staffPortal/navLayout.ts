import type { Settings } from '@/components/providers/SettingsProvider';
import type { StaffPortalRole } from './types';

/** Whether staff portal section tabs use the left sidebar (vs top row). */
export function staffPortalUsesSidebar(settings: Settings, role: StaffPortalRole): boolean {
  if (role === 'teacher') {
    return (settings.teacherNavLayout ?? 'sidebar') === 'sidebar';
  }
  return (settings.adminNavLayout ?? 'sidebar') === 'sidebar';
}

export function staffPortalNavLayoutPatch(
  role: StaffPortalRole,
  layout: 'top' | 'sidebar',
): Partial<Settings> {
  if (role === 'teacher') {
    return { teacherNavLayout: layout };
  }
  return { adminNavLayout: layout };
}

/** Map signed-in staff session to portal nav layout role. */
export function staffPortalRoleFromLoginState(loginState: string): StaffPortalRole | null {
  if (loginState === 'teacher') return 'teacher';
  if (loginState === 'secretary') return 'secretary';
  if (
    loginState === 'admin' ||
    loginState === 'developer' ||
    loginState === 'prizeClerk' ||
    loginState === 'houseCoordinator'
  ) {
    return 'admin';
  }
  return null;
}

export function staffPortalUsesSidebarForLogin(settings: Settings, loginState: string): boolean {
  const role = staffPortalRoleFromLoginState(loginState);
  if (!role) return (settings.adminNavLayout ?? 'sidebar') === 'sidebar';
  return staffPortalUsesSidebar(settings, role);
}
