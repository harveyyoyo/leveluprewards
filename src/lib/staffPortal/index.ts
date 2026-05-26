export type { StaffPortalRole, StaffPortalTabDef, StaffPortalTabKind, StaffPortalTabView } from './types';
export {
  STAFF_PORTAL_TAB_REGISTRY,
  staffPortalAddOnTabs,
  staffPortalAdminAddOnIsOn,
  staffPortalTeacherPinSideEffects,
  staffPortalCoreTabs,
  staffPortalDefaultTab,
  staffPortalTabsForRole,
} from './tabRegistry';
export {
  staffPortalTabIsValid,
  useStaffPortalTabs,
  type UseStaffPortalTabsOptions,
  type UseStaffPortalTabsResult,
} from './useStaffPortalTabs';
