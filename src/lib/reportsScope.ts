import type { Class, Coupon, Prize, Student } from '@/lib/types';
import { isPrizeSchoolWideTeachers, prizeRestrictionTeacherIds } from '@/lib/prizeUtils';

/** Students linked to a teacher via class primary teacher or explicit `teacherIds`. */
export function studentsInTeacherScope(teacherId: string, students: Student[], classes: Class[]): Student[] {
  const classIdsForTeacher = new Set(classes.filter((c) => c.primaryTeacherId === teacherId).map((c) => c.id));
  return students.filter((s) => {
    if (s.teacherIds?.includes(teacherId)) return true;
    if (s.classId && classIdsForTeacher.has(s.classId)) return true;
    return false;
  });
}

/** Coupons created by this teacher (includes legacy rows with no `createdByTeacherId` only when scope is school). */
export function couponsForTeacherReport(teacherId: string, coupons: Coupon[], scope: 'school' | 'teacher'): Coupon[] {
  if (scope === 'school') return coupons;
  return coupons.filter((c) => c.createdByTeacherId === teacherId);
}

/** Prizes visible to this teacher’s students (school-wide or restriction includes teacher). */
export function prizesForTeacherReport(teacherId: string, prizes: Prize[]): Prize[] {
  return prizes.filter((p) => {
    if (isPrizeSchoolWideTeachers(p)) return true;
    return prizeRestrictionTeacherIds(p).includes(teacherId);
  });
}
