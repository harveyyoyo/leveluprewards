'use client';

import { RecessAttendanceSection } from '@/components/recess/RecessAttendanceSection';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { RECESS_TAB_INFO_SECTIONS } from '@/lib/staffPortal/recessTabInfo';

/** @deprecated Recess lives under Attendance → Room passes. Kept for dynamic import compatibility. */
export function AdminRecessTab({ schoolId }: { schoolId: string; students?: unknown[] }) {
  return (
    <StaffPortalTabPanel
      tabValue="recess"
      infoSections={RECESS_TAB_INFO_SECTIONS}
      infoAriaLabel="About recess checkout"
      trailing={<TabWalkthroughHeaderAction />}
    >
      <RecessAttendanceSection schoolId={schoolId} />
    </StaffPortalTabPanel>
  );
}

export default AdminRecessTab;
