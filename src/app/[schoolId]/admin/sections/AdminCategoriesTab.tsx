'use client';

import { StaffPointsTab } from '@/components/points/StaffPointsTab';
import type { Category, Class, Student, Teacher } from '@/lib/types';

export function AdminCategoriesTab({
  categories,
  teachers,
  classes,
  students,
  schoolId,
  onRandomizeColors,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: {
  categories: Category[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  classes: Class[] | null | undefined;
  students: Student[] | null | undefined;
  schoolId: string;
  onRandomizeColors: () => void | Promise<void>;
  onAddCategory: () => void;
  onEditCategory: (c: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
}) {
  return (
    <StaffPointsTab
      variant="admin"
      schoolId={schoolId}
      categories={categories}
      teachers={teachers}
      classes={classes}
      students={students}
      onRandomizeColors={onRandomizeColors}
      onAddCategory={onAddCategory}
      onEditCategory={onEditCategory}
      onDeleteCategory={onDeleteCategory}
    />
  );
}
