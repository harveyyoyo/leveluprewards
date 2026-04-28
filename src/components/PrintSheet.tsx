'use client';

import type { Coupon } from '@/lib/types';
import { Coupon as CouponComponent } from '@/components/Coupon';
import { chunkCouponsForPrint } from '@/lib/coupon-print';

export { COUPONS_PER_PRINT_PAGE } from '@/lib/coupon-print';

interface PrintSheetProps {
  coupons: Coupon[];
  schoolId: string | null;
}

export function PrintSheet({ coupons, schoolId }: PrintSheetProps) {
  if (coupons.length === 0) {
    return null;
  }

  const pages = chunkCouponsForPrint(coupons);

  return (
    <div id="coupon-print-root">
      {pages.map((pageCoupons, pageIndex) => (
        <div key={pageIndex} className="coupon-print-page">
          {pageCoupons.map((c, index) => (
            <div key={`${c.code}-${pageIndex}-${index}`} className="print-coupon-wrapper">
              <CouponComponent coupon={c} schoolId={schoolId} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
