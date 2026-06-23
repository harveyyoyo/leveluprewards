'use client';

import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';
import { ClassroomTabLauncher } from '@/components/classroom/ClassroomTabLauncher';
import type { Category, Class, Student } from '@/lib/types';

/** Rewards admin tab — launcher only. Full classroom UI lives in /classroom-realm (new tab). */
export function AdminClassroomTab({
  schoolId,
}: {
  categories?: Category[] | null;
  classes?: Class[] | null;
  students?: Student[] | null;
  schoolId: string;
  initialSection?: ClassroomTabSection;
}) {
  return <ClassroomTabLauncher schoolId={schoolId} />;
}
