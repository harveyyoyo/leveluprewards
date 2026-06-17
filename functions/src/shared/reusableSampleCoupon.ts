/** Mirrors src/lib/coupons/reusableSampleCoupon.ts (functions bundle does not import app src). */

export const DEFAULT_REUSABLE_SAMPLE_COUPON_CODE = "000";
export const DEFAULT_REUSABLE_SAMPLE_COUPON_VALUE = 10;
export const DEFAULT_REUSABLE_SAMPLE_COUPON_CATEGORY = "Demo";

export type ReusableSampleCouponConfig = {
  enabled: boolean;
  code: string;
  value: number;
  category: string;
};

export function normalizeReusableSampleCouponCode(raw: unknown): string {
  const s = String(raw ?? "").trim().toUpperCase();
  if (/^\d{1,6}$/.test(s)) return s;
  return DEFAULT_REUSABLE_SAMPLE_COUPON_CODE;
}

export function resolveReusableSampleCouponConfig(
  appSettings: Record<string, unknown> | null | undefined,
): ReusableSampleCouponConfig {
  const enabled = appSettings?.enableReusableSampleCoupon === true;
  const code = normalizeReusableSampleCouponCode(appSettings?.reusableSampleCouponCode);
  const rawValue = Number(appSettings?.reusableSampleCouponValue);
  const value = Number.isFinite(rawValue)
    ? Math.min(1000, Math.max(1, Math.round(rawValue)))
    : DEFAULT_REUSABLE_SAMPLE_COUPON_VALUE;
  const category =
    String(appSettings?.reusableSampleCouponCategory || DEFAULT_REUSABLE_SAMPLE_COUPON_CATEGORY).trim() ||
    DEFAULT_REUSABLE_SAMPLE_COUPON_CATEGORY;
  return { enabled, code, value, category };
}

export function isReusableSampleCouponRedemption(
  appSettings: Record<string, unknown> | null | undefined,
  couponCode: string,
): boolean {
  const cfg = resolveReusableSampleCouponConfig(appSettings);
  return cfg.enabled && couponCode.toUpperCase() === cfg.code;
}

export function buildReusableSampleCouponDoc(
  config: ReusableSampleCouponConfig,
  createdAt = Date.now(),
): Record<string, unknown> {
  return {
    code: config.code,
    value: config.value,
    category: config.category,
    teacher: "Demo",
    used: false,
    reusableSample: true,
    redemptionScope: "school",
    description: "Reusable demo coupon — unlimited redemptions while enabled in kiosk settings.",
    createdAt,
  };
}
