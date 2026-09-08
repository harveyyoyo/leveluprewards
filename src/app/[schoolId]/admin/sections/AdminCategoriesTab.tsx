'use client';

import { StaffPointsTab } from '@/components/points/StaffPointsTab';
import { AdminCouponsTab } from '@/app/[schoolId]/admin/sections/AdminCouponsTab';
import { AdminCurrencyDesignTab } from '@/app/[schoolId]/admin/sections/AdminCurrencyDesignTab';
import type { Settings } from '@/components/providers/SettingsProvider';
import type { Category, Class, Coupon, Student, Teacher, Database } from '@/lib/types';
import { type Firestore, type DocumentReference } from 'firebase/firestore';

export function AdminCategoriesTab({
  categories,
  teachers,
  classes,
  students,
  schoolId,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onUpdateCategory,
  availableCoupons,
  redeemedCoupons,
  getStudentName,
  onDeleteCoupon,
  onPurgeRedeemed,
  showCouponManagement = false,
  firestore,
  schoolDocRef,
  schoolData,
  settings: _settings,
  updateSettings: _updateSettings,
}: {
  categories: Category[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  classes: Class[] | null | undefined;
  students: Student[] | null | undefined;
  schoolId: string;
  onAddCategory: () => void;
  onEditCategory: (c: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onUpdateCategory?: (category: Category) => void | Promise<void>;
  availableCoupons?: Coupon[];
  redeemedCoupons?: Coupon[];
  getStudentName?: (id?: string) => string;
  onDeleteCoupon?: (id: string) => Promise<void>;
  onPurgeRedeemed?: () => Promise<void>;
  showCouponManagement?: boolean;
  firestore?: Firestore | null;
  schoolDocRef?: DocumentReference | null;
  schoolData?: Database | null | undefined;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
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

  const currencyContent = (
    <AdminCurrencyDesignTab 
      schoolId={schoolId}
      firestore={firestore || null}
      schoolDocRef={schoolDocRef || null}
      schoolData={schoolData}
    />
  );

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
      onUpdateCategory={onUpdateCategory}
      couponManagementContent={couponManagementContent}
      currencyContent={currencyContent}
    />
  );
}
