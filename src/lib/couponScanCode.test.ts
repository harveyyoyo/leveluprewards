import { describe, expect, it } from 'vitest';
import { isCouponScanCode, normalizeCouponCodeInput } from './couponScanCode';

describe('couponScanCode', () => {
  it('normalizes to uppercase trimmed', () => {
    expect(normalizeCouponCodeInput(' 123456 ')).toBe('123456');
  });

  it('accepts 6-digit coupon codes in print range', () => {
    expect(isCouponScanCode('100000')).toBe(true);
    expect(isCouponScanCode('999999')).toBe(true);
  });

  it('rejects student-style short numeric ids', () => {
    expect(isCouponScanCode('100')).toBe(false);
    expect(isCouponScanCode('12345')).toBe(false);
  });

  it('rejects prize and alphanumeric codes', () => {
    expect(isCouponScanCode('PZ123456')).toBe(false);
    expect(isCouponScanCode('ABC123')).toBe(false);
  });
});
