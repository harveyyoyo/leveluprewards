'use client';

import { BrandedQrCode } from '@/components/qr/BrandedQrCode';
import { PrintBarcode } from '@/components/print/PrintBarcode';
import { normalizePrintBarcodeValue, type PrintBarcodeVariant } from '@/lib/printBarcode';
import { cn } from '@/lib/utils';

export type PrintIdCardScanCodeProps = {
  value: string;
  useQr?: boolean;
  variant?: PrintBarcodeVariant;
  /** Center badge initials/text inside the QR (preferred over logo on ID cards). */
  centerLabel?: string | null;
  logoSrc?: string | null;
  /** `inline` = left avatar slot; `footer` = bottom barcode strip. */
  placement?: 'inline' | 'footer';
  /** Plain QR with no center logo or initials (recommended for coupons). */
  hideCenterBadge?: boolean;
  className?: string;
};

/**
 * Scan zone for printed ID cards — barcode (default) or QR when enabled in school settings.
 */
export function PrintIdCardScanCode({
  value,
  useQr = false,
  variant = 'id-card',
  centerLabel,
  logoSrc,
  placement = 'footer',
  hideCenterBadge = false,
  className,
}: PrintIdCardScanCodeProps) {
  const normalized = normalizePrintBarcodeValue(value);
  if (!normalized) return null;

  if (useQr) {
    const inline = placement === 'inline';
    return (
      <BrandedQrCode
        value={normalized}
        fill={inline}
        renderSize={512}
        compactCenter={inline && !!centerLabel}
        size={inline ? undefined : 160}
        centerLabel={centerLabel}
        logoSrc={hideCenterBadge ? null : centerLabel ? null : logoSrc}
        hideCenterBadge={hideCenterBadge}
        className={cn('print-id-qr', inline && 'print-id-qr--inline', className)}
      />
    );
  }

  return <PrintBarcode value={normalized} variant={variant} className={className} />;
}
