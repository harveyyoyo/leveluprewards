'use client';

import { StaffClassroomTab } from '@/components/points/StaffClassroomTab';
import type { Category, Class, Student } from '@/lib/types';

export function AdminClassroomTab({
  categories,
  classes,
  students,
  schoolId,
}: {
  categories: Category[] | null | undefined;
  classes: Class[] | null | undefined;
  students: Student[] | null | undefined;
  schoolId: string;
}) {
  return (
    <StaffClassroomTab
      variant="admin"
      schoolId={schoolId}
      categories={categories}
      classes={classes}
      students={students}
    />
  );
}
