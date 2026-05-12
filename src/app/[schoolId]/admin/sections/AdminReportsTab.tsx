'use client';

import { SchoolReportsPanel } from '@/components/reports/SchoolReportsPanel';
import type { Category, Class, Coupon, Prize, Student, Teacher } from '@/lib/types';

export function AdminReportsTab({
  schoolName,
  students,
  classes,
  teachers,
  coupons,
  prizes,
  categories,
  rafflePointsPerTicket,
}: {
  schoolName: string;
  students: Student[] | null | undefined;
  classes: Class[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  coupons: Coupon[] | null | undefined;
  prizes: Prize[] | null | undefined;
  categories: Category[] | null | undefined;
  rafflePointsPerTicket?: number;
}) {
  return (
    <SchoolReportsPanel
      scope="school"
      schoolName={schoolName}
      students={students ?? []}
      classes={classes ?? []}
      teachers={teachers ?? []}
      coupons={coupons ?? []}
      prizes={prizes ?? []}
      categories={categories ?? []}
      rafflePointsPerTicket={rafflePointsPerTicket}
    />
  );
}
