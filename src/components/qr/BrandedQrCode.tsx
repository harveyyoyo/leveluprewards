'use client';

import { forwardRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from '@/lib/utils';

/** Same-origin default when Firestore `appLogoUrl` is unset. */
export const DEFAULT_BRANDED_QR_LOGO_SRC = '/logo.png';

export type BrandedQrCodeProps = {
  value: string;
  /** Display box edge length in CSS px (ignored when `fill` is true). */
  size?: number;
  /** Canvas render resolution — higher values print sharper. */
  renderSize?: number;
  /** Size to fill the parent (e.g. mm-based ID card slot). */
  fill?: boolean;
  /** Smaller center badge for compact ID-card QRs (better scan reliability). */
  compactCenter?: boolean;
  /** Center badge text (e.g. student initials). Takes precedence over `logoSrc`. */
  centerLabel?: string | null;
  /** Center badge image; falls back to {@link DEFAULT_BRANDED_QR_LOGO_SRC}. */
  logoSrc?: string | null;
  className?: string;
  caption?: string;
  /** When true, no center badge (plain QR — best for coupons). */
  hideCenterBadge?: boolean;
};

/**
 * QR code with optional center badge (initials or logo).
 * Uses error correction level H so scanners still read with a small center quiet zone.
 */
export const BrandedQrCode = forwardRef<HTMLDivElement, BrandedQrCodeProps>(function BrandedQrCode(
  {
    value,
    size = 200,
    renderSize,
    fill = false,
    compactCenter = false,
    hideCenterBadge = false,
    centerLabel,
    logoSrc,
    className,
    caption,
  },
  ref,
) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const label = hideCenterBadge ? null : centerLabel?.trim().slice(0, 3).toUpperCase() || null;
  const logo = logoSrc?.trim() || DEFAULT_BRANDED_QR_LOGO_SRC;
  const showCenterBadge = !hideCenterBadge && (label || logoSrc !== null);
  const displayEdge = fill ? undefined : size;
  const canvasEdge = renderSize ?? Math.max(320, Math.round((displayEdge ?? 80) * 5));
  const badgeSize = compactCenter ? undefined : Math.round(canvasEdge * (label ? 0.18 : 0.22));
  const badgePad = compactCenter ? undefined : Math.max(label ? 2 : 4, Math.round((badgeSize ?? 0) * 0.1));
  const labelFontSize = compactCenter ? undefined : Math.max(8, Math.round((badgeSize ?? 0) * 0.4));

  return (
    <div className={cn('inline-flex flex-col items-center gap-2', fill && 'h-full w-full', className)}>
      <div
        ref={ref}
        className={cn(
          'branded-qr-code relative inline-block leading-none bg-white',
          fill && 'h-full w-full',
          compactCenter && 'branded-qr-code--compact',
        )}
        data-branded-qr=""
        data-qr-value={trimmed}
        style={
          fill
            ? undefined
            : {
                width: displayEdge,
                height: displayEdge,
              }
        }
      >
        <QRCodeCanvas
          value={trimmed}
          size={canvasEdge}
          level={hideCenterBadge ? 'M' : 'H'}
          marginSize={4}
          bgColor="#ffffff"
          fgColor="#000000"
          className="branded-qr-canvas block h-full w-full"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
          aria-hidden
        >
          {showCenterBadge ? (
          <div
            className={cn(
              'branded-qr-center-badge flex items-center justify-center rounded-sm bg-white ring-1 ring-black/10',
              compactCenter && 'branded-qr-center-badge--compact',
            )}
            style={
              compactCenter
                ? undefined
                : {
                    width: badgeSize,
                    height: badgeSize,
                    padding: badgePad,
                  }
            }
          >
            {label ? (
              <span
                className={cn(
                  'branded-qr-center-label font-black leading-none tracking-tight text-slate-900',
                  compactCenter && 'branded-qr-center-label--compact',
                )}
                style={labelFontSize ? { fontSize: labelFontSize } : undefined}
              >
                {label}
              </span>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logo} alt="" className="h-full w-full object-contain" />
            )}
          </div>
          ) : null}
        </div>
      </div>
      {caption ? (
        <p className="max-w-[min(100%,280px)] text-center text-xs text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
});
