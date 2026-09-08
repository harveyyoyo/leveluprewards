import { describe, expect, it } from 'vitest';
import { isReusableCoupon, STAFF_REUSABLE_COUPON_PRINT_NOTE } from './reusableCoupon';

describe('reusableCoupon', () => {
  it('treats staff reusable and demo sample flags as reusable', () => {
    expect(isReusableCoupon({ reusable: true })).toBe(true);
    expect(isReusableCoupon({ reusableSample: true })).toBe(true);
    expect(isReusableCoupon({ reusable: true, reusableSample: true })).toBe(true);
  });

  it('treats ordinary coupons as one-time', () => {
    expect(isReusableCoupon({})).toBe(false);
    expect(isReusableCoupon({ reusable: false })).toBe(false);
    expect(isReusableCoupon(undefined)).toBe(false);
  });

  it('keeps the keep-this-slip print note short', () => {
    expect(STAFF_REUSABLE_COUPON_PRINT_NOTE.length).toBeLessThanOrEqual(40);
  });
});
