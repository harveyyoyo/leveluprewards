/** Document id / kiosk code for the default test coupon (pairs with test student id 100). */
export const SAMPLE_TEST_COUPON_CODE = "100";

export function buildSampleTestCoupon(createdAt: number): Record<string, unknown> {
  return {
    code: SAMPLE_TEST_COUPON_CODE,
    value: 10,
    category: "Test",
    teacher: "Teacher",
    used: false,
    createdAt,
    redemptionScope: "school",
    description: "Sample coupon for testing",
  };
}
