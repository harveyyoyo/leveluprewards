export type { StaffPortalRole, StaffPortalTabDef, StaffPortalTabKind, StaffPortalTabView } from './types';
export {
  STAFF_PORTAL_TAB_REGISTRY,
  STAFF_PORTAL_CANONICAL_TAB_ORDER,
  staffPortalAddOnTabs,
  staffPortalAdminAddOnIsOn,
  staffPortalAllAddOnTabValues,
  staffPortalAppendTabsInCanonicalOrder,
  staffPortalMergePinnedAddOnValues,
  staffPortalOrderMainTabs,
  staffPortalOrderPinnedAddOnValues,
  staffPortalSortPinnedTabDefs,
  staffPortalSortTabs,
  staffPortalTeacherPinSideEffects,
  staffPortalCoreTabs,
  staffPortalDefaultTab,
  staffPortalPinWelcomeFirst,
  staffPortalIsTeacherOperatedTab,
  staffPortalTabDescription,
  staffPortalTabsForRole,
  staffPortalTeacherOperatedAdminNote,
  staffPortalSchoolwideTeacherNote,
  STAFF_PORTAL_SCHOOLWIDE_TEACHER_TAB_VALUES,
} from './tabRegistry';
export {
  staffPortalTabIsValid,
  useStaffPortalTabs,
  type UseStaffPortalTabsOptions,
  type UseStaffPortalTabsResult,
} from './useStaffPortalTabs';
export {
  staffPortalNavLayoutPatch,
  staffPortalRoleFromLoginState,
  staffPortalUsesSidebar,
  staffPortalUsesSidebarForLogin,
} from './navLayout';
