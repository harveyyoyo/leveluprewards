/** Coupons laid out per letter page in print CSS (see `.coupon-print-page`). */
export const COUPONS_PER_PRINT_PAGE = 12;

export function chunkCouponsForPrint<T>(items: T[], pageSize = COUPONS_PER_PRINT_PAGE): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
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
