'use client';

import type { CSSProperties } from 'react';
import type { StaffIdCardSubject } from '@/lib/staff/staffIdCardSubject';
import {
  staffIdCardAccentColor,
  staffIdCardDisplayName,
  staffIdCardInitials,
  staffIdCardRoleLabel,
  staffIdCardScanCode,
} from '@/lib/staff/staffIdCardSubject';
import { cn, getContrastColor } from '@/lib/utils';
import { APP_NAME, APP_TAGLINE } from '@/lib/appBranding';
import { PrintBarcode } from '@/components/print/PrintBarcode';
import { useSettings } from '@/components/providers/SettingsProvider';

export function StaffIdCard({
  subject,
  schoolName,
  schoolLogoUrl,
  appLogoUrl,
  appName,
  appTagline,
  isColorEnabled,
  className,
  cornerStyle,
}: {
  subject: StaffIdCardSubject;
  schoolName: string;
  schoolLogoUrl?: string | null;
  appLogoUrl?: string | null;
  appName?: string;
  appTagline?: string;
  isColorEnabled: boolean;
  className?: string;
  cornerStyle?: 'rounded' | 'rectangular';
}) {
  const { settings } = useSettings();
  const resolvedCornerStyle = cornerStyle ?? settings.idCardCornerStyle ?? 'rounded';
  const displayName = staffIdCardDisplayName(subject);
  const roleLabel = staffIdCardRoleLabel(subject);
  const scanCode = staffIdCardScanCode(subject);
  const nameFitScale = displayName.length >= 28 ? 0.78 : displayName.length >= 22 ? 0.88 : 1;
  const fitStyle: CSSProperties = { ['--print-id-name-fit-scale' as string]: String(nameFitScale) };
  const accent = staffIdCardAccentColor(subject);
  const onColor = getContrastColor(accent) === 'white';
  const textColor = onColor ? '#ffffff' : '#0f172a';
  const mutedText = onColor ? 'rgba(255,255,255,0.82)' : 'rgba(15,23,42,0.72)';
  const dividerColor = onColor ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.18)';
  const avatarBg = onColor ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.45)';

  const coloredCardStyle: CSSProperties = {
    ['--staff-card-accent' as string]: accent,
    background: accent,
    borderColor: accent,
    borderWidth: 2,
    color: textColor,
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
    ...fitStyle,
  };

  const cardStyle = isColorEnabled ? coloredCardStyle : fitStyle;
  const headerStyle: CSSProperties = isColorEnabled ? { color: textColor } : {};
  const avatarStyle: CSSProperties = isColorEnabled
    ? {
        borderColor: onColor ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.2)',
        backgroundColor: avatarBg,
        color: textColor,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }
    : {
        borderColor: 'rgba(15,23,42,0.2)',
        backgroundColor: 'rgba(15,23,42,0.06)',
        color: '#0f172a',
      };
  const mainTextColor = isColorEnabled ? textColor : '#0f172a';
  const mainMutedText = isColorEnabled ? mutedText : 'rgba(15,23,42,0.72)';
  const barcodeDivider = isColorEnabled ? dividerColor : '#e5e7eb';

  return (
    <div
      className={cn(
        'print-id-card print-staff-id-card',
        isColorEnabled && 'is-colored',
        resolvedCornerStyle === 'rectangular' && 'print-id-card--rectangular',
        className,
      )}
      style={cardStyle}
    >
      <div className="print-id-header-container" style={{ borderBottomColor: barcodeDivider }}>
        <div className="print-id-app" style={headerStyle}>
          {appLogoUrl ? (
            <div className="print-id-app-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={appLogoUrl} alt="" className="object-contain" />
            </div>
          ) : null}
          <div className="print-id-app-text">
            <span className="print-id-app-name" style={{ color: mainTextColor }}>
              {appName || APP_NAME}
            </span>
            <span className="print-id-app-tagline" style={{ color: mainMutedText }}>
              {appTagline ?? APP_TAGLINE}
            </span>
          </div>
        </div>
        <div className="print-id-school" style={headerStyle}>
          <span className="print-id-header">{schoolName}</span>
          {schoolLogoUrl ? (
            <div className="print-id-school-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={schoolLogoUrl} alt="" className="object-contain" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="print-id-main flex items-center justify-center gap-3 px-2 min-h-0 flex-1">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-lg font-black"
          style={avatarStyle}
          aria-hidden
        >
          {staffIdCardInitials(subject)}
        </div>
        <div className="min-w-0 flex-1 text-left" style={{ color: mainTextColor }}>
          <div className="print-id-name text-left">{displayName}</div>
          <p className="text-[8pt] font-semibold uppercase tracking-wide mt-0.5" style={{ color: mainMutedText }}>
            Staff
          </p>
          <p className="text-[10pt] font-bold leading-tight truncate" style={{ color: mainTextColor }} title={roleLabel}>
            {roleLabel}
          </p>
        </div>
      </div>

      <div
        className="print-id-barcode-container mt-auto"
        style={{ background: '#ffffff', color: '#000000', borderTop: `1px solid ${barcodeDivider}` }}
      >
        <PrintBarcode value={scanCode} variant="id-card" />
      </div>
    </div>
  );
}
