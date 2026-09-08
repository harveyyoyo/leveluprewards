'use client';

import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';
import { ClassroomCommandCenter, type ClassroomWorkbenchTab } from '@/components/classroom/ClassroomCommandCenter';
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
    raffle: 'raffle',
  };

  const initialTab = initialSection ? mapSectionToTab[initialSection] : 'seating';

  return (
    <ClassroomCommandCenter
      schoolId={schoolId}
      categories={categories}
      classes={classes}
      students={students}
      variant="admin"
      initialTab={initialTab}
    />
  );
}
