/** Coupons laid out per letter page in print CSS (see `.coupon-print-page`). */
export const COUPON_PRINT_PAGE_SIZE_OPTIONS = [10, 30] as const;
export type CouponPrintPageSize = (typeof COUPON_PRINT_PAGE_SIZE_OPTIONS)[number];
export const COUPONS_PER_PRINT_PAGE: CouponPrintPageSize = 10;

export function normalizeCouponPrintPageSize(value: number): CouponPrintPageSize {
  return COUPON_PRINT_PAGE_SIZE_OPTIONS.includes(value as CouponPrintPageSize)
    ? (value as CouponPrintPageSize)
    : COUPONS_PER_PRINT_PAGE;
}

export function chunkCouponsForPrint<T>(items: T[], pageSize = COUPONS_PER_PRINT_PAGE): T[][] {
  const safePageSize = normalizeCouponPrintPageSize(pageSize);
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += safePageSize) {
    pages.push(items.slice(i, i + safePageSize));
  }
  return pages;
}

/** Unique 6-digit numeric codes for one print job (document id = code). */
export function generateUniqueCouponCodes(count: number): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(Math.floor(100000 + Math.random() * 900000).toString());
  }
  return Array.from(codes);
}
