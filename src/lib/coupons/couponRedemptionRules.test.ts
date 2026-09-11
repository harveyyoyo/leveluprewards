import { describe, expect, it } from 'vitest';
import { buildRedemptionPrintNote } from './couponRedemptionRules';
import { STAFF_REUSABLE_COUPON_PRINT_NOTE } from './reusableCoupon';

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
});
