'use client';

import { GoalsManager } from '@/components/goals/GoalsManager';
import type { Student, Class, Category, Prize } from '@/lib/types';

export function AdminGoalsTab(props: {
  schoolId: string;
  students: Student[];
  classes: Class[];
  categories: Category[];
  prizes: Prize[];
}) {
  const { schoolId, students, classes, categories, prizes } = props;
  return (
    <GoalsManager
      schoolId={schoolId}
      variant="admin"
      students={students}
      classes={classes}
      categories={categories}
      prizes={prizes}
    />
  );
}
