'use client';

import type { Coupon } from '@/lib/types';
import { Coupon as CouponComponent } from '@/components/Coupon';

interface PrintSheetProps {
  coupons: Coupon[];
  schoolId: string | null;
  schoolName?: string | null;
}

export function PrintSheet({ coupons, schoolId, schoolName }: PrintSheetProps) {
  if (coupons.length === 0) {
    return null;
  }

  // Chunk coupons into pages of 12
  const pages = [];
  for (let i = 0; i < coupons.length; i += 12) {
    pages.push(coupons.slice(i, i + 12));
  }

  return (
    <div id="print-container">
      {pages.map((pageCoupons, pageIndex) => (
        <div key={`page-${pageIndex}`} className="print-container-page">
          {pageCoupons.map((c, index) => (
            <div key={`${c.code}-${index}`} className="print-coupon-wrapper coupon-print-match-wrapper">
              <CouponComponent coupon={c} schoolId={schoolId} schoolName={schoolName} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
