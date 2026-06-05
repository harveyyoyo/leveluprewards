'use client';

import { forwardRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from '@/lib/utils';

/** Same-origin default when Firestore `appLogoUrl` is unset. */
export const DEFAULT_BRANDED_QR_LOGO_SRC = '/logo.png';

export type BrandedQrCodeProps = {
  value: string;
  size?: number;
  /** Center badge image; falls back to {@link DEFAULT_BRANDED_QR_LOGO_SRC}. */
  logoSrc?: string | null;
  className?: string;
  caption?: string;
};

/**
 * QR code with a white-backed app logo in the center.
 * Uses error correction level H so phones still scan with ~25% of the pattern covered.
 */
export const BrandedQrCode = forwardRef<HTMLDivElement, BrandedQrCodeProps>(function BrandedQrCode(
  { value, size = 200, logoSrc, className, caption },
  ref,
) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const logo = logoSrc?.trim() || DEFAULT_BRANDED_QR_LOGO_SRC;
  const badgeSize = Math.round(size * 0.24);
  const badgePad = Math.max(4, Math.round(badgeSize * 0.12));

  return (
    <div className={cn('inline-flex flex-col items-center gap-2', className)}>
      <div
        ref={ref}
        className="branded-qr-code relative inline-block leading-none bg-white"
        data-branded-qr=""
        style={{ width: size, height: size }}
      >
        <QRCodeCanvas
          value={trimmed}
          size={size}
          level="H"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#000000"
          className="block h-full w-full"
        />
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div
            className="flex items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-black/10"
            style={{
              width: badgeSize,
              height: badgeSize,
              padding: badgePad,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" className="h-full w-full object-contain" />
          </div>
        </div>
      </div>
      {caption ? (
        <p className="max-w-[min(100%,280px)] text-center text-xs text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
});
