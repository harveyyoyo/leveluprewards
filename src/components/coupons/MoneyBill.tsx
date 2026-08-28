'use client';

import { cn } from '@/lib/utils';
import type { Coupon } from '@/lib/types';
import { PrintIdCardScanCode } from '@/components/print/PrintIdCardScanCode';
import { useSettings } from '@/components/providers/SettingsProvider';

/** Guilloche-style SVG corner ornament rendered inline. */
function GuillocheCorner({ color, className }: { color: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 60 60"
      className={cn('absolute w-[1.2em] h-[1.2em]', className)}
      aria-hidden="true"
    >
      {/* Layered arcs creating a guilloche / rosette effect */}
      <path d="M0,0 Q30,8 60,0" fill="none" stroke={color} strokeWidth="1.2" opacity="0.6" />
      <path d="M0,0 Q8,30 0,60" fill="none" stroke={color} strokeWidth="1.2" opacity="0.6" />
      <path d="M0,0 Q20,5 40,0" fill="none" stroke={color} strokeWidth="0.8" opacity="0.4" />
      <path d="M0,0 Q5,20 0,40" fill="none" stroke={color} strokeWidth="0.8" opacity="0.4" />
      <path d="M0,0 C10,10 15,25 5,50" fill="none" stroke={color} strokeWidth="0.6" opacity="0.35" />
      <path d="M0,0 C10,10 25,15 50,5" fill="none" stroke={color} strokeWidth="0.6" opacity="0.35" />
      <circle cx="4" cy="4" r="2.5" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5" />
      <circle cx="4" cy="4" r="5" fill="none" stroke={color} strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

/** Decorative horizontal line with diamond center accent. */
function OrnamentLine({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-[0.15em] w-full" aria-hidden="true">
      <div className="flex-1 h-[1px]" style={{ backgroundColor: color, opacity: 0.4 }} />
      <div
        className="w-[0.2em] h-[0.2em] rotate-45"
        style={{ backgroundColor: color, opacity: 0.5 }}
      />
      <div
        className="w-[0.12em] h-[0.12em] rotate-45"
        style={{ backgroundColor: color, opacity: 0.35 }}
      />
      <div
        className="w-[0.2em] h-[0.2em] rotate-45"
        style={{ backgroundColor: color, opacity: 0.5 }}
      />
      <div className="flex-1 h-[1px]" style={{ backgroundColor: color, opacity: 0.4 }} />
    </div>
  );
}

export type MoneyBillDesign = {
  bgColor: string;
  accentColor: string;
  textColor: string;
  denominationPrefix: string;
  billTitle: string;
  borderStyle: 'ornate' | 'classic' | 'simple';
  showSerial: boolean;
  showGuilloche: boolean;
  showSchoolName: boolean;
};

export const MONEY_BILL_DEFAULTS: MoneyBillDesign = {
  bgColor: '#e8f5e9',
  accentColor: '#2e7d32',
  textColor: '#1b5e20',
  denominationPrefix: '$',
  billTitle: 'SCHOOL BUCKS',
  borderStyle: 'ornate',
  showSerial: true,
  showGuilloche: true,
  showSchoolName: true,
};

export function MoneyBill({
  coupon,
  schoolName,
  design = MONEY_BILL_DEFAULTS,
}: {
  coupon: Coupon;
  schoolName?: string;
  design?: MoneyBillDesign;
}) {
  const { settings } = useSettings();
  const useQr = settings.couponUseQrCode === true;
  const value = Number(coupon.value ?? 0);
  const serial = coupon.code || 'A000000';

  const borderClasses = {
    ornate: 'border-[2px] p-[0.15em]',
    classic: 'border-[2px] p-[0.1em]',
    simple: 'border-[1.5px] p-[0.08em]',
  };

  return (
    <div
      className={cn(
        'money-bill-scalable inline-flex flex-col relative overflow-hidden',
        'h-[5em] w-[11em] rounded-[0.15em]',
        borderClasses[design.borderStyle],
      )}
      style={{
        backgroundColor: design.bgColor,
        borderColor: design.accentColor,
        color: design.textColor,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {/* Inner border for ornate/classic */}
      {design.borderStyle !== 'simple' && (
        <div
          className="absolute inset-[0.12em] pointer-events-none rounded-[0.08em]"
          style={{
            border: design.borderStyle === 'ornate'
              ? `1px solid ${design.accentColor}40`
              : `1px dashed ${design.accentColor}30`,
          }}
        />
      )}

      {/* Guilloche corner ornaments */}
      {design.showGuilloche && (
        <>
          <GuillocheCorner color={design.accentColor} className="top-[0.08em] left-[0.08em]" />
          <GuillocheCorner color={design.accentColor} className="top-[0.08em] right-[0.08em] -scale-x-100" />
          <GuillocheCorner color={design.accentColor} className="bottom-[0.08em] left-[0.08em] -scale-y-100" />
          <GuillocheCorner color={design.accentColor} className="bottom-[0.08em] right-[0.08em] scale-x-[-1] scale-y-[-1]" />
        </>
      )}

      {/* Subtle radial watermark background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          background: `radial-gradient(ellipse at center, ${design.accentColor} 0%, transparent 70%)`,
        }}
      />

      {/* Content wrapper — positioned relative above the decorations */}
      <div className="relative flex flex-col items-center justify-between h-full w-full z-10 px-[0.2em] py-[0.1em]">

        {/* Top row: School name */}
        {design.showSchoolName && schoolName && (
          <div
            className="text-[0.28em] font-bold uppercase tracking-[0.2em] leading-none text-center w-full truncate"
            style={{ color: design.accentColor, opacity: 0.8 }}
          >
            {schoolName}
          </div>
        )}

        {/* Ornament line */}
        <OrnamentLine color={design.accentColor} />

        {/* Bill title */}
        <div
          className="text-[0.42em] font-black uppercase tracking-[0.25em] leading-none text-center"
          style={{ color: design.textColor }}
        >
          {design.billTitle}
        </div>

        {/* Central denomination area */}
        <div className="flex items-center justify-center gap-[0.4em] w-full my-[0.05em]">
          {/* Left denomination badge */}
          <div
            className="flex items-center justify-center w-[1.6em] h-[1.3em] rounded-[0.12em] shrink-0"
            style={{
              border: `1.5px solid ${design.accentColor}`,
              background: `linear-gradient(135deg, ${design.bgColor}, ${design.accentColor}10)`,
            }}
          >
            <span className="text-[0.7em] font-black leading-none" style={{ color: design.textColor }}>
              {design.denominationPrefix}{value}
            </span>
          </div>

          {/* Center: Category + Teacher */}
          <div className="flex flex-col items-center min-w-0 flex-1 gap-[0.04em]">
            <div
              className="text-[0.32em] font-bold italic leading-tight text-center w-full truncate"
              style={{ color: design.textColor }}
            >
              {coupon.category}
            </div>
            {/* Signature line */}
            <div className="w-[80%] border-b" style={{ borderColor: `${design.accentColor}50` }} />
            <div
              className="text-[0.22em] leading-none mt-[0.02em]"
              style={{ color: design.textColor, opacity: 0.7 }}
            >
              Issued by: {coupon.teacher}
            </div>
          </div>

          {/* Right denomination badge */}
          <div
            className="flex items-center justify-center w-[1.6em] h-[1.3em] rounded-[0.12em] shrink-0"
            style={{
              border: `1.5px solid ${design.accentColor}`,
              background: `linear-gradient(135deg, ${design.accentColor}10, ${design.bgColor})`,
            }}
          >
            <span className="text-[0.7em] font-black leading-none" style={{ color: design.textColor }}>
              {design.denominationPrefix}{value}
            </span>
          </div>
        </div>

        {/* Ornament line */}
        <OrnamentLine color={design.accentColor} />

        {/* Bottom row: Serial + Barcode/QR */}
        <div className="flex items-center justify-between w-full gap-[0.15em]">
          {design.showSerial && (
            <div
              className="text-[0.2em] leading-none tracking-[0.08em] shrink-0"
              style={{ fontFamily: '"Courier New", Courier, monospace', color: design.textColor, opacity: 0.6 }}
            >
              No. {serial}
            </div>
          )}
          <div className="flex-1 flex justify-center min-w-0">
            {useQr ? (
              <PrintIdCardScanCode
                value={coupon.code}
                useQr
                hideCenterBadge
                variant="coupon"
                placement="inline"
                className="coupon-qr"
              />
            ) : (
              <PrintIdCardScanCode value={coupon.code} variant="coupon" className="coupon-barcode max-w-full" />
            )}
          </div>
          {design.showSerial && (
            <div
              className="text-[0.2em] leading-none tracking-[0.08em] shrink-0"
              style={{ fontFamily: '"Courier New", Courier, monospace', color: design.textColor, opacity: 0.6 }}
            >
              No. {serial}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
