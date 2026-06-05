'use client';

import type { StaffPortalTabView } from '@/lib/staffPortal';
import { StaffPortalAddFeatureTabsMenu } from './StaffPortalAddFeatureTabsMenu';

export type TeacherPortalAddMoreMenuProps = {
  tabs: StaffPortalTabView[];
  onAddTab: (tabValue: string) => void;
  onTurnAllOn?: () => void;
  onTurnAllOff?: () => void;
};

export function TeacherPortalAddMoreMenu({
  tabs,
  onAddTab,
  onTurnAllOn,
  onTurnAllOff,
}: TeacherPortalAddMoreMenuProps) {
  return (
    <StaffPortalAddFeatureTabsMenu
      tabs={tabs}
      onAddTab={onAddTab}
      onTurnAllOn={onTurnAllOn}
      onTurnAllOff={onTurnAllOff}
      align="start"
    />
  );
}
