'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Coupon } from '@/lib/types';
import { Coupon as CouponComponent } from '@/components/coupons/Coupon';
import { chunkCouponsForPrint, normalizeCouponPrintPageSize, type CouponPrintPageSize } from '@/lib/coupons/couponPrint';
import { cn } from '@/lib/utils';

export { COUPONS_PER_PRINT_PAGE, COUPON_PRINT_PAGE_SIZE_OPTIONS } from '@/lib/coupons/couponPrint';

interface PrintSheetProps {
  coupons: Coupon[];
  schoolId: string | null;
  couponsPerPage?: CouponPrintPageSize;
  onReady?: () => void;
}

export function PrintSheet({ coupons, schoolId, couponsPerPage = 10, onReady }: PrintSheetProps) {
  useEffect(() => {
    document.body.classList.add('coupon-printing');
    onReady?.();
    return () => {
      document.body.classList.remove('coupon-printing');
    };
  }, [onReady]);

  if (coupons.length === 0) {
    return null;
  }

  const pageSize = normalizeCouponPrintPageSize(couponsPerPage);
  const pages = chunkCouponsForPrint(coupons, pageSize);

  const sheet = (
    <div id="coupon-print-root">
      {pages.map((pageCoupons, pageIndex) => (
        <div key={pageIndex} className={cn('coupon-print-page', `coupon-print-page--${pageSize}`)}>
          {pageCoupons.map((c, index) => (
            <div key={`${c.code}-${pageIndex}-${index}`} className="print-coupon-wrapper">
              <CouponComponent coupon={c} schoolId={schoolId} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(sheet, document.body);
}
