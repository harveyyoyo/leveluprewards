import { describe, expect, it } from 'vitest';
import {
  buildRedemptionPrintNote,
  normalizeRedemptionScope,
  studentMayRedeemCoupon,
} from './couponRedemptionRules';
import { STAFF_REUSABLE_COUPON_PRINT_NOTE } from './reusableCoupon';
import type { Coupon, Student } from '../types';

function student(partial: Partial<Student> & Pick<Student, 'id'>): Student {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    points: 0,
    nfcId: '',
    ...partial,
  };
}

describe('buildRedemptionPrintNote', () => {
  it('prints the keep-this-slip note for schoolwide reusable coupons', () => {
    expect(
      buildRedemptionPrintNote({
        scope: 'school',
        issuingTeacherDisplayName: 'Mrs. Smith',
        classNamesInOrder: [],
        teacherNamesInOrder: [],
        reusable: true,
      }),
    ).toBe(STAFF_REUSABLE_COUPON_PRINT_NOTE);
  });

  it('returns nothing for ordinary schoolwide coupons', () => {
    expect(
      buildRedemptionPrintNote({
        scope: 'school',
        issuingTeacherDisplayName: 'Mrs. Smith',
        classNamesInOrder: [],
        teacherNamesInOrder: [],
      }),
    ).toBeUndefined();
  });

  it('lists selected student names', () => {
    expect(
      buildRedemptionPrintNote({
        scope: 'students',
        issuingTeacherDisplayName: 'Mrs. Smith',
        classNamesInOrder: [],
        teacherNamesInOrder: [],
        studentNamesInOrder: ['Ada Lovelace', 'Grace Hopper'],
      }),
    ).toBe('Redeem only for: Ada Lovelace, Grace Hopper');
  });
});

describe('studentMayRedeemCoupon', () => {
  it('allows only the selected students', () => {
    const coupon: Coupon = {
      id: 'c1',
      code: 'ABC',
      value: 10,
      category: 'Bonus',
      teacher: 'Mrs. Smith',
      used: false,
      createdAt: 1,
      redemptionScope: 'students',
      allowedStudentIds: ['s1', 's2'],
    };
    expect(studentMayRedeemCoupon(coupon, student({ id: 's1' })).ok).toBe(true);
    expect(studentMayRedeemCoupon(coupon, student({ id: 's3' })).ok).toBe(false);
  });

  it('normalizes students scope', () => {
    expect(normalizeRedemptionScope({ redemptionScope: 'students' })).toBe('students');
  });
});
