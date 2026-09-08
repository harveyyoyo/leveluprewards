/** Printed on staff reusable coupons so the slip is not thrown away after one scan. */
export const STAFF_REUSABLE_COUPON_PRINT_NOTE = 'WARNING: Staff keep. Do not throw away.';

export function isReusableCoupon(
  coupon: { reusable?: boolean; reusableSample?: boolean } | null | undefined,
): boolean {
  return coupon?.reusable === true || coupon?.reusableSample === true;
}
