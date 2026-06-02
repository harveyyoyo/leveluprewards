'use client';

import type { StaffPortalTabView } from '@/lib/staffPortal';
import { StaffPortalAddFeatureTabsMenu } from './StaffPortalAddFeatureTabsMenu';

export type TeacherPortalAddMoreMenuProps = {
  tabs: StaffPortalTabView[];
  onAddTab: (tabValue: string) => void;
};

export function TeacherPortalAddMoreMenu({ tabs, onAddTab }: TeacherPortalAddMoreMenuProps) {
  return <StaffPortalAddFeatureTabsMenu tabs={tabs} onAddTab={onAddTab} align="start" />;
}
