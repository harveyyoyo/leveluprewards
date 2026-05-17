/** Printed coupon codes are 6-digit numbers (document id = code; see generateUniqueCouponCodes). */
export function normalizeCouponCodeInput(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isCouponScanCode(code: string): boolean {
  const normalized = normalizeCouponCodeInput(code);
  if (!/^\d{6}$/.test(normalized)) return false;
  const n = Number(normalized);
  return n >= 100_000 && n <= 999_999;
}
