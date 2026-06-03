'use client';

import React from 'react';
import type { Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { resolveStudentThemeWithSchoolDefault } from '@/lib/themeContrast';
import { useSettings } from '@/components/providers/SettingsProvider';
import { APP_NAME, APP_TAGLINE } from '@/lib/appBranding';
import { GoogleFontLoader } from '@/components/themes/GoogleFontLoader';
import { PrintBarcode } from '@/components/print/PrintBarcode';

export function StudentIdCard({
  student,
  schoolName,
  schoolLogoUrl,
  className,
  isColorEnabled,
  appLogoUrl,
  appName,
  appTagline,
  cornerStyle,
  /** When true, always apply stored themes (e.g. theme editor preview) even if the school has student themes turned off. */
  forceStudentThemePreview = false,
}: {
  student: Student;
  schoolName: string;
  schoolLogoUrl?: string | null;
  className: string;
  isColorEnabled: boolean;
  appLogoUrl?: string | null;
  appName?: string;
  appTagline?: string;
  cornerStyle?: 'rounded' | 'rectangular';
  forceStudentThemePreview?: boolean;
}) {
  const { settings } = useSettings();
  const resolvedCornerStyle = cornerStyle ?? settings.idCardCornerStyle ?? 'rounded';
  const studentThemesOn = forceStudentThemePreview || settings.enableStudentThemes;
  const theme = resolveStudentThemeWithSchoolDefault(
    student.theme,
    settings.defaultStudentTheme,
    studentThemesOn,
  );
  const themeEmoji = theme?.emoji;
  const customEmojiUrl = student.customEmojiUrl;
  const themeFontFamily = theme?.fontFamily;
  const themeTracking = typeof theme?.fontTracking === 'number' ? theme.fontTracking : undefined;
  const themeFontStyle = theme?.fontStyle;
  const themeFontWeight = typeof theme?.fontWeight === 'number' ? theme.fontWeight : undefined;
  const themeFontScale = typeof theme?.fontScale === 'number' && theme.fontScale > 0 ? theme.fontScale : undefined;

  const emojiGlowFilter = (() => {
    const primary = theme?.primary;
    if (!primary || typeof primary !== 'string') return undefined;
    // Works well for hex colors; safe fallback for other formats.
    return `drop-shadow(0 0 8px ${primary}) drop-shadow(0 0 18px ${primary})`;
  })();

  const cardStyle = theme && isColorEnabled
    ? {
        background: theme.backgroundStyle || theme.background,
        color: theme.text,
        borderColor: theme.primary,
        WebkitPrintColorAdjust: 'exact' as const,
        printColorAdjust: 'exact' as const,
        ...(themeFontFamily ? { fontFamily: themeFontFamily } : {}),
        ...(themeFontStyle ? { fontStyle: themeFontStyle } : {}),
        ...(themeFontWeight ? { fontWeight: themeFontWeight } : {}),
        ...(themeFontScale !== undefined ? { ['--print-id-font-scale' as string]: String(themeFontScale) } : {}),
      }
    : undefined;

  const trackedStyle: React.CSSProperties | undefined = themeTracking !== undefined ? { letterSpacing: `${themeTracking}em` } : undefined;
  const headerStyle = theme && isColorEnabled ? { color: theme.text, ...trackedStyle } : trackedStyle;
  const mainStyle = theme && isColorEnabled ? {} : undefined;
  const avatarStyle = theme && isColorEnabled
    ? { borderColor: theme.primary, background: theme.cardBackground || theme.background, WebkitPrintColorAdjust: 'exact' as const, printColorAdjust: 'exact' as const }
    : undefined;
  const nameStyle = theme && isColorEnabled ? { color: theme.text, ...trackedStyle } : trackedStyle;
  const classStyle = theme && isColorEnabled ? { color: theme.text, opacity: 0.9, ...trackedStyle } : trackedStyle;
  const metaStyle = theme && isColorEnabled ? { color: theme.text, opacity: 0.8, ...trackedStyle } : trackedStyle;

  const displayFirst = student.firstName ?? '';
  const displayLast = student.lastName ?? '';
  const displayNickname = student.nickname?.trim() || null;
  const fullName = `${displayFirst} ${displayLast}`.trim();
  const longestNamePart = Math.max(fullName.length, displayNickname?.length ?? 0);
  const nameFitScale = longestNamePart >= 34 ? 0.68 : longestNamePart >= 28 ? 0.76 : longestNamePart >= 22 ? 0.88 : 1;
  const fitStyle: React.CSSProperties = { ['--print-id-name-fit-scale' as string]: String(nameFitScale) };
  const resolvedCardStyle = cardStyle ? { ...cardStyle, ...fitStyle } : fitStyle;

  return (
    <div
      className={cn(
        'print-id-card',
        isColorEnabled && 'is-colored',
        resolvedCornerStyle === 'rectangular' && 'print-id-card--rectangular',
      )}
      style={resolvedCardStyle}
    >
      {themeFontFamily && <GoogleFontLoader fontFamily={themeFontFamily} />}
      <div className="print-id-header-container">
        <div className="print-id-app" style={headerStyle}>
          {appLogoUrl && (
            <div className="print-id-app-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={appLogoUrl} alt="" className="object-contain" />
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
              <img src={schoolLogoUrl} alt="" className="object-contain" />
            </div>
          )}
        </div>
      </div>
      
      <div className="print-id-main" style={mainStyle}>
        <div className="print-id-left flex items-center" style={{ marginLeft: '0.1in', gap: '0.12in' }}>
          <div className={cn(
            "print-id-avatar transition-all duration-300",
            settings.photoBorderRadius === 'sm' && 'rounded-sm',
            settings.photoBorderRadius === 'md' && 'rounded-md',
            settings.photoBorderRadius === 'lg' && 'rounded-2xl',
            settings.photoBorderRadius === 'full' && 'rounded-full',
            settings.photoBorderRadius === 'none' && 'rounded-none',
            settings.photoDropShadow === 'sm' && 'drop-shadow-sm',
            settings.photoDropShadow === 'md' && 'drop-shadow-md',
            settings.photoDropShadow === 'lg' && 'drop-shadow-xl',
            settings.photoDropShadow === 'none' && 'drop-shadow-none',
          )} style={avatarStyle}>
            {student.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.photoUrl} alt="" className={cn(
                "h-full w-full transition-all duration-300",
                settings.photoDisplayMode === 'cover' ? 'object-cover' : 'object-contain'
              )} />
            ) : (
              <span style={{...nameStyle, fontSize: '20pt', fontWeight: 800 }}>{(student.firstName[0] || '')}{(student.lastName[0] || '')}</span>
            )}
          </div>
          
          <div className="print-id-text">
            <div className="print-id-name" style={nameStyle}>{fullName}</div>
            {displayNickname ? (
              <div className="print-id-nickname" style={metaStyle}>{displayNickname}</div>
            ) : null}
            <div className="print-id-class" style={classStyle}>Class: {className}</div>
          </div>
        </div>

        {(customEmojiUrl || themeEmoji) && (
          <div className="print-id-theme-emoji-center" aria-hidden style={emojiGlowFilter ? { filter: emojiGlowFilter } : undefined}>
            {customEmojiUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={customEmojiUrl} alt="" className="print-id-custom-emoji-img" />
            ) : (
              themeEmoji
            )}
          </div>
        )}
      </div>
      
      {/* Barcode zone: SVG Code 128 + quiet zone for reliable camera / wedge scan */}
      <div className="print-id-barcode-container" style={{ background: '#ffffff', color: '#000000', borderTop: `1px solid #e5e7eb` }}>
        <PrintBarcode value={student.nfcId} variant="id-card" />
      </div>
    </div>
  );
}
