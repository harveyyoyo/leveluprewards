/** Document id / kiosk code for the default reusable demo coupon (John Doe logs in as student 100). */
export const SAMPLE_TEST_COUPON_CODE = "000";

export function buildSampleTestCoupon(createdAt: number): Record<string, unknown> {
  return {
    code: SAMPLE_TEST_COUPON_CODE,
    value: 10,
    category: "Demo",
    teacher: "Demo",
    used: false,
    reusableSample: true,
    createdAt,
    redemptionScope: "school",
    description: "Reusable demo coupon 000 for John Doe (student 100).",
  };
}
