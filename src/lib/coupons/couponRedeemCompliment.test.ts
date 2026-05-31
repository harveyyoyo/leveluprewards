import { describe, expect, it } from 'vitest';
import {
  COUPON_TRASH_REMINDER,
  couponRedeemStudentMessage,
  fallbackCouponRedeemCompliment,
} from './couponRedeemCompliment';

describe('couponRedeemCompliment', () => {
  it('builds student message with points, compliment, and trash reminder', () => {
    expect(
      couponRedeemStudentMessage({
        points: 20,
        compliment: 'Keep up the good behavior!',
        includeTrashReminder: true,
      }),
    ).toBe(`You gained 20 points. Keep up the good behavior! ${COUPON_TRASH_REMINDER}`);
  });

  it('uses category-aware fallback compliments', () => {
    const line = fallbackCouponRedeemCompliment('Good Behavior', 42);
    expect(line.length).toBeGreaterThan(10);
    expect(line.toLowerCase()).toMatch(/behavior|earned|good|keep/);
  });

  it('falls back to generic praise for unknown categories', () => {
    const line = fallbackCouponRedeemCompliment('Mystery Category XYZ', 7);
    expect(line.length).toBeGreaterThan(8);
  });
});
