'use client';

import { StaffPointsTab } from '@/components/points/StaffPointsTab';
import { AdminCouponsTab } from '@/app/[schoolId]/admin/sections/AdminCouponsTab';
import type { Category, Class, Coupon, Student, Teacher } from '@/lib/types';

export function AdminCategoriesTab({
  categories,
  teachers,
  classes,
  students,
  schoolId,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  availableCoupons,
  redeemedCoupons,
  getStudentName,
  onDeleteCoupon,
  onPurgeRedeemed,
  showCouponManagement = false,
}: {
  categories: Category[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  classes: Class[] | null | undefined;
  students: Student[] | null | undefined;
  schoolId: string;
  onAddCategory: () => void;
  onEditCategory: (c: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  availableCoupons?: Coupon[];
  redeemedCoupons?: Coupon[];
  getStudentName?: (id?: string) => string;
  onDeleteCoupon?: (id: string) => Promise<void>;
  onPurgeRedeemed?: () => Promise<void>;
  showCouponManagement?: boolean;
}) {
  const couponManagementContent =
    showCouponManagement && availableCoupons && redeemedCoupons && getStudentName ? (
      <AdminCouponsTab
        embedded
        availableCoupons={availableCoupons}
        redeemedCoupons={redeemedCoupons}
        getStudentName={getStudentName}
        schoolId={schoolId}
        onDeleteCoupon={onDeleteCoupon}
        onPurgeRedeemed={onPurgeRedeemed}
      />
    ) : undefined;

  return (
    <StaffPointsTab
      variant="admin"
      schoolId={schoolId}
      categories={categories}
      teachers={teachers}
      classes={classes}
      students={students}
      onAddCategory={onAddCategory}
      onEditCategory={onEditCategory}
      onDeleteCategory={onDeleteCategory}
      couponManagementContent={couponManagementContent}
    />
  );
}
