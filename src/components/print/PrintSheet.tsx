'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Coupon } from '@/lib/types';
import { Coupon as CouponComponent, type PreviewCurrency } from '@/components/coupons/Coupon';
import {
  chunkCouponsForPrint,
  DEFAULT_COUPON_CORNER_STYLE,
  normalizeCouponPrintPageSize,
  type CouponCornerStyle,
  type CouponPrintPageSize,
} from '@/lib/coupons/couponPrint';
import { cn } from '@/lib/utils';

export { COUPONS_PER_PRINT_PAGE, COUPON_PRINT_PAGE_SIZE_OPTIONS } from '@/lib/coupons/couponPrint';

interface PrintSheetProps {
  coupons: Coupon[];
  schoolId: string | null;
  couponsPerPage?: CouponPrintPageSize;
  cornerStyle?: CouponCornerStyle;
  /** Currency settings resolved by the persistent parent — avoids a fresh `useCurrency()`
   *  fetch inside this conditionally-mounted-right-before-print component (see
   *  "Blank/Missing Data on Second Print" in docs/frontend-gotchas.md). */
  currency?: PreviewCurrency;
  onReady?: () => void;
}

export function PrintSheet({
  coupons,
  schoolId,
  couponsPerPage = 10,
  cornerStyle = DEFAULT_COUPON_CORNER_STYLE,
  currency,
  onReady,
}: PrintSheetProps) {
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
            <div
              key={`${c.code}-${pageIndex}-${index}`}
              className={cn(
                'print-coupon-wrapper',
                cornerStyle === 'rounded' && 'print-coupon-wrapper--rounded',
              )}
            >
              <CouponComponent coupon={c} schoolId={schoolId} cornerStyle={cornerStyle} previewCurrency={currency} />
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
