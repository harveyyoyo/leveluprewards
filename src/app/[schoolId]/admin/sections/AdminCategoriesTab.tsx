'use client';

import { CouponPrintPanel } from '@/components/coupons/CouponPrintPanel';
import { AwardCategoriesPanel } from '@/components/points/AwardCategoriesPanel';
import { ManualPointsAwardDialog } from '@/components/points/ManualPointsAwardDialog';
import { PointsTabLayout } from '@/components/points/PointsTabLayout';
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
  const sortedClasses = (classes ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <PointsTabLayout
      categoriesContent={
        <AwardCategoriesPanel
          categories={categories}
          teachers={teachers}
          mode="admin"
          onRandomizeColors={onRandomizeColors}
          onAddCategory={onAddCategory}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
        />
      }
      printContent={
        <CouponPrintPanel
          schoolId={schoolId}
          categories={categories}
          classes={classes}
          teachers={teachers}
        />
      }
      manualContent={
        <ManualPointsAwardDialog
          variant="inline"
          students={students ?? []}
          classes={sortedClasses}
          categories={categories}
          description="Select any students in the school and apply points instantly—no printed coupon required."
        />
      }
    />
  );
}
