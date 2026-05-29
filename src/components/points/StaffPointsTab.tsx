'use client';

import { CouponPrintPanel } from '@/components/coupons/CouponPrintPanel';
import { AwardCategoriesPanel } from '@/components/points/AwardCategoriesPanel';
import { ManualPointsAwardDialog } from '@/components/points/ManualPointsAwardDialog';
import { PointsTabLayout } from '@/components/points/PointsTabLayout';
import type { Category, Class, Student, Teacher } from '@/lib/types';

export type StaffPointsTabVariant = 'admin' | 'teacher';

export type StaffPointsTabProps = {
  variant: StaffPointsTabVariant;
  schoolId: string;
  categories: Category[] | null | undefined;
  teachers?: Teacher[] | null | undefined;
  classes: Class[] | null | undefined;
  students: Student[] | null | undefined;
  /** Secretary / coupon-only desk: print section only. */
  printOnly?: boolean;
  /** Teacher id when variant is teacher (for category ownership and print scope). */
  managerTeacherId?: string;
  /** Admin on teacher portal or admin tab: full category + schoolwide print scope. */
  schoolWideAccess?: boolean;
  issuerDisplayName?: string;
  isGraphic?: boolean;
  className?: string;
  onAddCategory?: () => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  manualDescription?: string;
  manualBudgetOptions?: React.ComponentProps<typeof ManualPointsAwardDialog>['budgetOptions'];
  manualAccentColor?: string;
  printAccentColor?: string;
  teacherBudget?: React.ComponentProps<typeof CouponPrintPanel>['teacherBudget'];
};

function filterCategoriesForStaff(
  categories: Category[] | null | undefined,
  variant: StaffPointsTabVariant,
  options: { schoolWideAccess?: boolean; managerTeacherId?: string; printOnly?: boolean },
): Category[] {
  const list = categories ?? [];
  if (variant === 'admin' || options.schoolWideAccess) return list;
  if (options.printOnly) {
    return list.filter((c) => !c.teacherId);
  }
  return list.filter((c) => !c.teacherId || (options.managerTeacherId && c.teacherId === options.managerTeacherId));
}

export function StaffPointsTab({
  variant,
  schoolId,
  categories,
  teachers,
  classes,
  students,
  printOnly = false,
  managerTeacherId,
  schoolWideAccess = false,
  issuerDisplayName = 'Admin',
  isGraphic = false,
  className,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  manualDescription,
  manualBudgetOptions,
  manualAccentColor,
  printAccentColor,
  teacherBudget,
}: StaffPointsTabProps) {
  const categoryList = filterCategoriesForStaff(categories, variant, {
    schoolWideAccess,
    managerTeacherId,
    printOnly,
  });
  const sortedClasses = (classes ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const fullCategoryAdmin = variant === 'admin' || schoolWideAccess;

  const sections = printOnly ? (['print'] as const) : (['categories', 'print', 'manual'] as const);

  const redemptionUi =
    variant === 'admin' || schoolWideAccess || printOnly ? ('admin' as const) : ('teacher' as const);

  return (
    <PointsTabLayout
      className={className}
      defaultSection={printOnly ? 'print' : variant === 'teacher' ? 'categories' : 'categories'}
      sections={[...sections]}
      isGraphic={isGraphic}
      categoriesContent={
        <AwardCategoriesPanel
          categories={categoryList}
          teachers={teachers}
          mode={fullCategoryAdmin ? 'admin' : 'teacher'}
          isGraphic={isGraphic}
          showWalkthrough={variant === 'teacher'}
          onAddCategory={onAddCategory}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          canEditCategory={
            onEditCategory
              ? (c) => fullCategoryAdmin || (!!managerTeacherId && c.teacherId === managerTeacherId)
              : undefined
          }
          canDeleteCategory={
            onDeleteCategory
              ? (c) => fullCategoryAdmin || (!!managerTeacherId && c.teacherId === managerTeacherId)
              : undefined
          }
        />
      }
      printContent={
        <CouponPrintPanel
          schoolId={schoolId}
          categories={categoryList}
          classes={classes}
          teachers={teachers}
          issuerDisplayName={issuerDisplayName}
          creatorTeacherId={redemptionUi === 'teacher' ? managerTeacherId : undefined}
          redemptionUi={redemptionUi}
          classFilterList={variant === 'teacher' && !schoolWideAccess ? sortedClasses : undefined}
          newCategoryTeacherId={variant === 'teacher' ? managerTeacherId : undefined}
          hideQuickAddCategory={printOnly}
          isGraphic={isGraphic}
          printAccentColor={printAccentColor}
          teacherBudget={teacherBudget}
        />
      }
      manualContent={
        printOnly ? (
          <></>
        ) : (
          <ManualPointsAwardDialog
            variant="inline"
            className="w-full"
            students={students ?? []}
            classes={sortedClasses}
            categories={categoryList}
            accentColor={manualAccentColor}
            isGraphic={isGraphic}
            description={
              manualDescription ??
              (variant === 'admin'
                ? 'Select any students in the school and apply points instantly—no printed coupon required.'
                : 'Select students on your roster and apply points instantly—no printed coupon required.')
            }
            budgetOptions={manualBudgetOptions}
          />
        )
      }
    />
  );
}
