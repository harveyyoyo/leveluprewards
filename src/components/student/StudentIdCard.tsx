'use client';



import React from 'react';

import type { Student, IdCardCustomOptions } from '@/lib/types';
import {
  DEFAULT_STUDENT_THEME_FONT_SCALE,
  DEFAULT_STUDENT_THEME_FONT_TRACKING,
} from '@/lib/types';

import { cn } from '@/lib/utils';

import { resolveStudentThemeWithSchoolDefault } from '@/lib/themeContrast';

import { resolveStudentIdCardUseQr } from '@/lib/idCardScanFormat';

import { useSettings } from '@/components/providers/SettingsProvider';

import { APP_NAME, APP_TAGLINE } from '@/lib/appBranding';

import { GoogleFontLoader } from '@/components/themes/GoogleFontLoader';

import { PrintIdCardScanCode } from '@/components/print/PrintIdCardScanCode';
import { PrintLevelUpDomain } from '@/components/print/PrintLevelUpDomain';
import {
  CreditCardBrand,
  CreditCardChip,
  CreditCardContactless,
  CreditCardValidThru,
  formatCreditCardPan,
} from '@/components/print/CreditCardChrome';

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
  forceStudentThemePreview = false,
  overrideLayout,
  overrideOptions,
  overrideOrientation,
}: {
  student: Student;
  schoolName: string;
  schoolLogoUrl?: string | null;
  className?: string;
  isColorEnabled: boolean;
  appLogoUrl?: string | null;
  appName?: string;
  appTagline?: string;
  cornerStyle?: 'rounded' | 'rectangular';
  forceStudentThemePreview?: boolean;
  overrideLayout?: 'classic' | 'credit_card' | 'modern' | 'minimalist' | 'high_vis';
  overrideOptions?: IdCardCustomOptions;
  overrideOrientation?: 'landscape' | 'portrait';
}) {

  const { settings } = useSettings();

  const resolvedCornerStyle = cornerStyle ?? settings.idCardCornerStyle ?? 'rounded';
  const resolvedLayout = overrideLayout ?? student.theme?.idCardLayout ?? settings.idCardLayout ?? 'classic';

  const studentThemesOn = forceStudentThemePreview || settings.enableStudentThemes;

  const theme = resolveStudentThemeWithSchoolDefault(

    student.theme,

    settings.defaultStudentTheme,

    studentThemesOn,

  );

  const useQr = resolveStudentIdCardUseQr(student.theme, settings.idCardUseQrCode === true);

  const themeEmoji = theme?.emoji;

  const customEmojiUrl = student.customEmojiUrl;

  const themeFontFamily = theme?.fontFamily;

  const themeTracking = theme
    ? (theme.fontTracking ?? DEFAULT_STUDENT_THEME_FONT_TRACKING)
    : undefined;

  const themeFontStyle = theme?.fontStyle;

  const themeFontWeight = typeof theme?.fontWeight === 'number' ? theme.fontWeight : undefined;

  const themeFontScale =
    theme && typeof theme.fontScale === 'number' && theme.fontScale > 0
      ? theme.fontScale
      : theme
        ? DEFAULT_STUDENT_THEME_FONT_SCALE
        : undefined;



  const emojiGlowStyle: React.CSSProperties | undefined = (() => {

    const primary = theme?.primary;

    if (!primary || typeof primary !== 'string') return undefined;

    return { boxShadow: `0 0 8px ${primary}, 0 0 18px ${primary}` };

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

        ...(themeTracking !== undefined ? { letterSpacing: `${themeTracking}em` } : {}),

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



  const options = overrideOptions ?? settings.idCardCustomOptions;
  const orientation = overrideOrientation ?? options?.orientation ?? settings.idCardOrientation ?? 'landscape';
  const isPortrait = orientation === 'portrait';
  const cardFinish = options?.cardFinish ?? 'none';

  const resolvedSchoolName = (options?.showSchoolName !== false)
    ? (options?.schoolNameOverride?.trim() || schoolName)
    : '';
  const showSchoolLogo = options?.showSchoolLogo !== false && Boolean(schoolLogoUrl);
  const showAppName = options?.showAppName !== false;
  const showAppTagline = options?.showAppTagline !== false;
  const showDomain = options?.showDomain !== false;
  const showEmoji = options?.showEmoji !== false;
  const showValidThru = options?.showValidThru === true;
  const validThruText = options?.validThruText?.trim() || '06/27';
  const showClass = options?.showClass !== false && Boolean(className);
  const classPrefix = options?.classPrefix ?? 'Class: ';
  const showIdNumber = options?.showIdNumber === true;
  const idNumberLabel = options?.idNumberLabel ?? 'ID:';
  const showPointsBadge = options?.showPointsBadge === true;
  const showBarcodeDigits = options?.showBarcodeDigits !== false;

  const displayFirst = student.firstName ?? '';
  const displayLast = student.lastName ?? '';
  const studentInitials = `${displayFirst[0] || ''}${displayLast[0] || ''}`.trim() || '?';
  const displayNickname = student.nickname?.trim() || null;
  const fullName = `${displayFirst} ${displayLast}`.trim();

  // Name formatting & casing
  let formattedName = fullName;
  if (options?.nameFormat === 'first_only') {
    formattedName = displayFirst || fullName;
  } else if (options?.nameFormat === 'nickname_preferred' && displayNickname) {
    formattedName = displayNickname;
  }

  if (options?.nameCasing === 'uppercase') {
    formattedName = formattedName.toUpperCase();
  } else if (options?.nameCasing === 'titlecase') {
    formattedName = formattedName.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  }

  const longestNamePart = Math.max(formattedName.length, displayNickname?.length ?? 0);
  const nameFitScale = longestNamePart >= 34 ? 0.68 : longestNamePart >= 28 ? 0.76 : longestNamePart >= 22 ? 0.88 : 1;
  const fitStyle: React.CSSProperties = { ['--print-id-name-fit-scale' as string]: String(nameFitScale) };
  const resolvedCardStyle = cardStyle ? { ...cardStyle, ...fitStyle } : fitStyle;

  const photoShapeClass = options?.photoShape === 'circle'
    ? 'rounded-full'
    : options?.photoShape === 'square'
      ? 'rounded-none'
      : options?.photoShape === 'rounded'
        ? 'rounded-2xl'
        : (settings.photoBorderRadius === 'sm' ? 'rounded-sm' :
           settings.photoBorderRadius === 'md' ? 'rounded-md' :
           settings.photoBorderRadius === 'lg' ? 'rounded-2xl' :
           settings.photoBorderRadius === 'full' ? 'rounded-full' :
           settings.photoBorderRadius === 'none' ? 'rounded-none' : 'rounded-full');

  const photoBorderClass = options?.photoBorder === false ? 'border-0' : 'border';

  const photoOrQr = useQr ? (
    <div className="print-id-qr-slot" aria-label={`Student scan code ${student.nfcId}`}>
      <PrintIdCardScanCode
        value={student.nfcId}
        useQr
        centerLabel={studentInitials}
        placement="inline"
      />
    </div>
  ) : (
    <div className={cn(
      "print-id-avatar transition-all duration-300",
      photoShapeClass,
      photoBorderClass,
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
        <span style={{...nameStyle, fontSize: '20pt', fontWeight: 800 }}>{studentInitials}</span>
      )}
    </div>
  );

  const barcodeFooter = !useQr ? (
    <div className="print-id-barcode-container" style={{ background: '#ffffff', color: '#000000', borderTop: `1px solid #e5e7eb` }}>
      <PrintIdCardScanCode value={student.nfcId} placement="footer" />
    </div>
  ) : null;

  return (
    <div
      className={cn(
        'print-id-card relative overflow-hidden',
        isPortrait && 'print-id-card--portrait',
        cardFinish === 'gloss' && 'print-id-finish-gloss',
        cardFinish === 'hologram' && 'print-id-finish-hologram',
        cardFinish === 'matte' && 'print-id-finish-matte',
        isColorEnabled && 'is-colored',
        resolvedCornerStyle === 'rectangular' && 'print-id-card--rectangular',
        resolvedLayout === 'credit_card' && !isPortrait && 'print-id-card--credit-card',
        resolvedLayout === 'modern' && !isPortrait && 'print-id-card--modern',
        resolvedLayout === 'minimalist' && !isPortrait && 'print-id-card--minimalist',
        resolvedLayout === 'high_vis' && !isPortrait && 'print-id-card--high-vis',
        useQr && 'print-id-card--qr-scan',
        displayNickname && 'has-nickname',
      )}
      style={resolvedCardStyle}
    >
      {themeFontFamily && <GoogleFontLoader fontFamily={themeFontFamily} />}

      {/* PORTRAIT ORIENTATION BADGE */}
      {isPortrait ? (
        <div className="flex flex-col h-full w-full justify-between relative text-center py-1">
          {/* Lanyard punch-hole simulator */}
          <div className="mx-auto w-7 h-1.5 rounded-full border border-black/20 bg-black/10 shrink-0 mb-1" aria-hidden="true" />

          {/* School Header */}
          <div className="flex items-center justify-center gap-1.5 px-2">
            {showSchoolLogo && schoolLogoUrl && (
              <div className="h-5 w-5 shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={schoolLogoUrl} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            )}
            {resolvedSchoolName && (
              <span className="text-[10px] font-black tracking-wider uppercase truncate max-w-[140px]" style={headerStyle}>
                {resolvedSchoolName}
              </span>
            )}
          </div>

          {/* Centered Photo or QR */}
          <div className="flex justify-center my-1 shrink-0">
            {photoOrQr}
          </div>

          {/* Name & Details */}
          <div className="space-y-0.5 px-2 my-auto">
            <div className="text-sm font-black leading-tight tracking-tight" style={nameStyle}>
              {formattedName}
            </div>
            {displayNickname && options?.nameFormat !== 'nickname_preferred' && (
              <div className="text-[10px] font-medium opacity-80" style={metaStyle}>"{displayNickname}"</div>
            )}
            {showClass && (
              <div className="text-[10px] font-bold opacity-90" style={classStyle}>
                {classPrefix}{className}
              </div>
            )}
            {showPointsBadge && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[9px] font-black mt-0.5">
                ⭐ {student.points ?? 0} pts
              </div>
            )}
          </div>

          {/* Bottom Barcode / QR + ID */}
          <div className="mt-auto pt-1 flex flex-col items-center justify-center">
            {barcodeFooter}
            {showIdNumber && (
              <div className="text-[8px] font-mono opacity-70 mt-0.5" style={metaStyle}>
                {idNumberLabel} {student.nfcId}
              </div>
            )}
            {showValidThru && (
              <div className="text-[7px] font-bold uppercase tracking-wider opacity-60 mt-0.5">
                VALID THRU {validThruText}
              </div>
            )}
          </div>
        </div>
      ) : resolvedLayout === 'credit_card' ? (
        <>
          <div className="credit-card-top">
            <CreditCardBrand
              schoolName={resolvedSchoolName}
              schoolLogoUrl={showSchoolLogo ? schoolLogoUrl : undefined}
              appLogoUrl={showAppName ? appLogoUrl : undefined}
              appName={showAppName ? appName : undefined}
              style={headerStyle}
            />
            {photoOrQr}
          </div>
          <div className="credit-card-mid" style={headerStyle}>
            <div className="credit-card-chip-row">
              <CreditCardChip />
              <CreditCardContactless />
            </div>
            <div className="credit-card-number">{formatCreditCardPan(student.nfcId)}</div>
            <div className="credit-card-identity">
              <div className="print-id-text">
                <div className="print-id-name" style={nameStyle}>{formattedName}</div>
                {displayNickname ? (
                  <div className="print-id-nickname" style={metaStyle}>{displayNickname}</div>
                ) : null}
                {showClass && (
                  <div className="text-[9px] font-bold opacity-90" style={classStyle}>{classPrefix}{className}</div>
                )}
              </div>
              <CreditCardValidThru date={validThruText} />
            </div>
          </div>
          {barcodeFooter}
        </>
      ) : (
        <>
          <div className="print-id-header-container">
            <div className="print-id-app" style={headerStyle}>
              {showAppName && appLogoUrl && (
                <div className="print-id-app-logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={appLogoUrl} alt="" className="object-contain" />
                </div>
              )}
              {showAppName && (
                <div className="print-id-app-text">
                  <span className="print-id-app-name">{appName || APP_NAME}</span>
                  {showAppTagline && <span className="print-id-app-tagline">{appTagline ?? APP_TAGLINE}</span>}
                  {showDomain && <PrintLevelUpDomain />}
                </div>
              )}
            </div>
            <div className="print-id-school" style={headerStyle}>
              {resolvedSchoolName && <span className="print-id-header">{resolvedSchoolName}</span>}
              {showSchoolLogo && schoolLogoUrl && (
                <div className="print-id-school-logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={schoolLogoUrl} alt="" className="object-contain" />
                </div>
              )}
            </div>
          </div>
          <div className="print-id-main" style={mainStyle}>
            <div className="print-id-left flex items-center" style={{ marginLeft: '0.1in', gap: useQr ? '0.1in' : '0.12in' }}>
              {photoOrQr}
              <div className="print-id-text">
                <div className="print-id-name" style={nameStyle}>{formattedName}</div>
                {displayNickname && options?.nameFormat !== 'nickname_preferred' ? (
                  <div className="print-id-nickname" style={metaStyle}>{displayNickname}</div>
                ) : null}
                {showClass && (
                  <div className="print-id-class" style={classStyle}>{classPrefix}{className}</div>
                )}
                {showPointsBadge && (
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[9px] font-black w-fit">
                    ⭐ {student.points ?? 0} pts
                  </div>
                )}
              </div>
            </div>
            {showEmoji && (customEmojiUrl || themeEmoji) && (
              <div className="print-id-theme-emoji-center" aria-hidden style={emojiGlowStyle}>
                {customEmojiUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={customEmojiUrl} alt="" className="print-id-custom-emoji-img" />
                ) : (
                  themeEmoji
                )}
              </div>
            )}
          </div>
          {barcodeFooter}
        </>
      )}
    </div>
  );
}


