'use client';

import type { Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { APP_NAME, APP_TAGLINE } from '@/lib/app-branding';
import { GoogleFontLoader } from '@/components/GoogleFontLoader';
import type { CSSProperties } from 'react';

/** Shrink / narrow long names so they fit the Avery badge print area. Sizes use theme scale so “Text size” always applies. */
function printNameFitStyle(fullName: string): CSSProperties {
  const n = fullName.trim().length;
  const s = 'var(--theme-font-scale, 1)';
  if (n <= 18) return {};
  if (n <= 26) return { fontSize: `calc(9pt * ${s})`, letterSpacing: '0.01em' };
  if (n <= 34)
    return {
      fontSize: `calc(8pt * ${s})`,
      letterSpacing: '0',
      transform: 'scaleX(0.92)',
      transformOrigin: 'left center',
    };
  return {
    fontSize: `calc(7pt * ${s})`,
    letterSpacing: '0',
    transform: 'scaleX(0.82)',
    transformOrigin: 'left center',
  };
}

export function StudentIdCard({
  student,
  schoolName,
  schoolLogoUrl,
  className,
  isColorEnabled,
  appLogoUrl,
  appName,
  appTagline,
}: {
  student: Student;
  schoolName: string;
  schoolLogoUrl?: string | null;
  className: string;
  isColorEnabled: boolean;
  appLogoUrl?: string | null;
  appName?: string;
  appTagline?: string;
}) {
  const { settings } = useSettings();
  const theme = student.theme;
  const themeEmoji = theme?.emoji;
  const themeFontFamily = theme?.fontFamily;
  const themeFontTracking = typeof theme?.fontTracking === 'number' ? theme.fontTracking : undefined;
  const themeFontStyle = theme?.fontStyle;
  const themeFontWeight = typeof theme?.fontWeight === 'number' ? theme.fontWeight : undefined;

  const emojiGlowFilter = (() => {
    const primary = theme?.primary;
    if (!primary || typeof primary !== 'string') return undefined;
    // Works well for hex colors; safe fallback for other formats.
    return `drop-shadow(0 0 8px ${primary}) drop-shadow(0 0 18px ${primary})`;
  })();

  const fontScaleVar =
    typeof theme?.fontScale === 'number' && theme.fontScale > 0 ? String(theme.fontScale) : '1';

  const cardStyle = theme && isColorEnabled
    ? {
        background: theme.backgroundStyle || theme.background,
        color: theme.text,
        borderColor: theme.primary,
        ...(themeFontFamily ? { fontFamily: themeFontFamily } : {}),
      }
    : undefined;

  const headerStyle = theme && isColorEnabled ? { color: theme.text } : undefined;
  const mainStyle = theme && isColorEnabled ? {} : undefined;
  const avatarStyle = theme && isColorEnabled
    ? { borderColor: theme.primary, background: theme.cardBackground || theme.background }
    : undefined;
  const nameStyle = theme
    ? {
        ...(isColorEnabled ? { color: theme.text } : {}),
        ...(themeFontStyle ? { fontStyle: themeFontStyle } : {}),
        ...(themeFontWeight ? { fontWeight: themeFontWeight } : {}),
        ...(themeFontTracking !== undefined ? { letterSpacing: `${themeFontTracking}em` } : {}),
      }
    : undefined;
  const displayName = `${student.firstName} ${student.lastName}`.trim();
  const classStyle = theme
    ? {
        ...(isColorEnabled ? { color: theme.text } : {}),
        opacity: 0.9,
        ...(themeFontStyle ? { fontStyle: themeFontStyle } : {}),
        ...(themeFontWeight ? { fontWeight: themeFontWeight } : {}),
        ...(themeFontTracking !== undefined ? { letterSpacing: `${themeFontTracking}em` } : {}),
      }
    : undefined;
  const metaStyle = theme
    ? {
        ...(isColorEnabled ? { color: theme.text } : {}),
        opacity: 0.8,
        ...(themeFontStyle ? { fontStyle: themeFontStyle } : {}),
        ...(themeFontWeight ? { fontWeight: themeFontWeight } : {}),
        ...(themeFontTracking !== undefined ? { letterSpacing: `${themeFontTracking}em` } : {}),
      }
    : undefined;

  return (
    <div
      className={cn("print-id-card", isColorEnabled && "is-colored")}
      style={{
        ...cardStyle,
        ['--theme-font-scale' as string]: fontScaleVar,
        ...(theme && !isColorEnabled && themeFontFamily ? { fontFamily: themeFontFamily } : {}),
      }}
    >
      {themeFontFamily && <GoogleFontLoader fontFamily={themeFontFamily} />}
      <div className="print-id-header-container">
        <div className="print-id-app" style={headerStyle}>
          {appLogoUrl && (
            <div className="print-id-app-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={appLogoUrl}
                alt=""
                loading="eager"
                decoding="async"
                className={settings.logoDisplayMode === 'cover' ? 'object-cover' : 'object-contain'}
              />
            </div>
          )}
          <div className="print-id-app-text">
            <span className="print-id-app-name">{appName || APP_NAME}</span>
            <span className="print-id-app-tagline">{appTagline ?? APP_TAGLINE}</span>
          </div>
        </div>
        
        <div className="print-id-school" style={headerStyle}>
          <span className="print-id-header">{schoolName}</span>
          {schoolLogoUrl && (
            <div className="print-id-school-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={schoolLogoUrl}
                alt=""
                loading="eager"
                decoding="async"
                className={settings.logoDisplayMode === 'cover' ? 'object-cover' : 'object-contain'}
              />
            </div>
          )}
        </div>
      </div>
      
      <div className="print-id-main" style={mainStyle}>
        <div className="print-id-left flex items-center" style={{ marginLeft: '0.1in', gap: '0.12in' }}>
          <div className="print-id-avatar" style={avatarStyle}>
            {student.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.photoUrl}
                alt=""
                loading="eager"
                decoding="async"
                className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'}
              />
            ) : (
              <span
                style={{
                  ...nameStyle,
                  fontSize: 'calc(20pt * var(--theme-font-scale, 1))',
                  ...(themeFontWeight !== undefined ? {} : { fontWeight: 800 }),
                }}
              >
                {(student.firstName?.[0] || '')}{(student.lastName?.[0] || '')}
              </span>
            )}
          </div>
          
          <div className="print-id-text">
            <div
              className="print-id-name"
              style={{
                ...nameStyle,
                ...printNameFitStyle(displayName),
                ...(themeFontTracking !== undefined ? { letterSpacing: `${themeFontTracking}em` } : {}),
              }}
            >
              {displayName}
            </div>
            {student.nickname?.trim() ? (
              <div className="print-id-nickname" style={metaStyle}>{student.nickname.trim()}</div>
            ) : null}
            <div className="print-id-class" style={classStyle}>Class: {className}</div>
            <div className="print-id-number" style={metaStyle}>ID #{student.nfcId}</div>
          </div>
        </div>

        {themeEmoji && (
          <div className="print-id-theme-emoji-center" aria-hidden style={emojiGlowFilter ? { filter: emojiGlowFilter } : undefined}>
            {themeEmoji}
          </div>
        )}
      </div>
      
      {/* Barcode zone: always light background + dark bars for scanner reliability */}
      <div className="print-id-barcode-container" style={{ background: '#ffffff', color: '#000000', borderTop: `1px solid #e5e7eb` }}>
        <div className="font-barcode text-[10px] leading-none" style={{ color: '#000000' }}>
          *{student.nfcId}*
        </div>
      </div>
    </div>
  );
}
