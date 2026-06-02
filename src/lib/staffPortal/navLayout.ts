import type { Settings } from '@/components/providers/SettingsProvider';
import type { StaffPortalRole } from './types';

/** Staff portal section tabs always use the left sidebar. */
export function staffPortalUsesSidebar(_settings: Settings, _role?: StaffPortalRole): boolean {
  return true;
}

/** @deprecated Top tabs removed; kept so existing settings patches are harmless. */
export function staffPortalNavLayoutPatch(
  role: StaffPortalRole,
  _layout: 'top' | 'sidebar',
): Partial<Settings> {
  if (role === 'teacher') {
    return { teacherNavLayout: 'sidebar' };
  }
  return { adminNavLayout: 'sidebar' };
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

export function staffPortalUsesSidebarForLogin(_settings: Settings, _loginState: string): boolean {
  return true;
}
