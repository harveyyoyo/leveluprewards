/** Mirrors src/lib/coupons/reusableCoupon.ts (functions bundle does not import app src). */
export function isReusableCouponDoc(
  coupon: { reusable?: unknown; reusableSample?: unknown } | null | undefined,
): boolean {
  return coupon?.reusable === true || coupon?.reusableSample === true;
}
