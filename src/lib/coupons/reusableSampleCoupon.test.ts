import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REUSABLE_SAMPLE_COUPON_CODE,
  isReusableSampleCouponRedemption,
  normalizeReusableSampleCouponCode,
  resolveReusableSampleCouponConfig,
} from './reusableSampleCoupon';

describe('reusableSampleCoupon', () => {
  it('normalizes short numeric codes', () => {
    expect(normalizeReusableSampleCouponCode(' 000 ')).toBe('000');
    expect(normalizeReusableSampleCouponCode('123456')).toBe('123456');
    expect(normalizeReusableSampleCouponCode('abc')).toBe(DEFAULT_REUSABLE_SAMPLE_COUPON_CODE);
  });

  it('resolves defaults when disabled', () => {
    const cfg = resolveReusableSampleCouponConfig({});
    expect(cfg.enabled).toBe(false);
    expect(cfg.code).toBe('000');
    expect(cfg.value).toBe(10);
  });

  it('detects reusable redemption only when enabled and code matches', () => {
    const settings = {
      enableReusableSampleCoupon: true,
      reusableSampleCouponCode: '000',
    };
    expect(isReusableSampleCouponRedemption(settings, '000')).toBe(true);
    expect(isReusableSampleCouponRedemption(settings, '001')).toBe(false);
    expect(isReusableSampleCouponRedemption({ enableReusableSampleCoupon: false }, '000')).toBe(false);
  });
});
