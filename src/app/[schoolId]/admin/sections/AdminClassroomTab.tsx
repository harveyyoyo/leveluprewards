'use client';

import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';
import { ClassroomCommandCenter, type ClassroomWorkbenchTab } from '@/components/classroom/ClassroomCommandCenter';
import { ClassroomOpenOwnLink } from '@/components/classroom/ClassroomOpenOwnLink';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import type { Category, Class, Student } from '@/lib/types';

export function AdminClassroomTab({
  schoolId,
  categories,
  classes,
  students,
  initialSection,
}: {
  categories?: Category[] | null;
  classes?: Class[] | null;
  students?: Student[] | null;
  schoolId: string;
  initialSection?: ClassroomTabSection;
}) {
  const mapSectionToTab: Record<ClassroomTabSection, ClassroomWorkbenchTab> = {
    seating: 'seating',
    behavior: 'behavior',
    'room-display': 'display',
    raffle: 'seating',
  };

  const initialTab = initialSection ? mapSectionToTab[initialSection] : 'seating';

  return (
    <StaffPortalTabPanel
      tabValue="classroom"
      trailing={
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <TabWalkthroughHeaderAction />
          <ClassroomOpenOwnLink schoolId={schoolId} />
        </div>
      }
    >
      <ClassroomCommandCenter
        schoolId={schoolId}
        categories={categories}
        classes={classes}
        students={students}
        variant="admin"
        initialTab={initialTab}
      />
    </StaffPortalTabPanel>
  );
}
