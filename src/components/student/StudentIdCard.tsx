'use client';



import React from 'react';

import type { Student } from '@/lib/types';
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
  overrideLayout,
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

}) {

  const { settings } = useSettings();

  const resolvedCornerStyle = cornerStyle ?? settings.idCardCornerStyle ?? 'rounded';
  const resolvedLayout = overrideLayout ?? settings.idCardLayout ?? 'classic';

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



  const displayFirst = student.firstName ?? '';

  const displayLast = student.lastName ?? '';

  const studentInitials = `${displayFirst[0] || ''}${displayLast[0] || ''}`.trim() || '?';

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
        resolvedLayout === 'credit_card' && 'print-id-card--credit-card',
        resolvedLayout === 'modern' && 'print-id-card--modern',
        resolvedLayout === 'minimalist' && 'print-id-card--minimalist',
        resolvedLayout === 'high_vis' && 'print-id-card--high-vis',
        useQr && 'print-id-card--qr-scan',
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
            <PrintLevelUpDomain />
          </div>
        </div>
        
        {resolvedLayout === 'credit_card' && (
           <>
             <div className="credit-card-chip" aria-hidden>
               <svg viewBox="0 0 32 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="32" height="24" rx="3" fill="url(#chip-grad)" stroke="rgba(120,80,0,0.3)" strokeWidth="0.5" />
                  <path d="M10 0v24M22 0v24M0 8h10M22 8h10M0 16h10M22 16h10M10 12h12" stroke="rgba(120,80,0,0.5)" strokeWidth="0.75" />
                  <defs>
                    <linearGradient id="chip-grad" x1="0" y1="0" x2="32" y2="24" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#d4a843" />
                      <stop offset="0.3" stopColor="#f0d060" />
                      <stop offset="0.5" stopColor="#c89830" />
                      <stop offset="0.7" stopColor="#e8c84c" />
                      <stop offset="1" stopColor="#b88828" />
                    </linearGradient>
                  </defs>
               </svg>
             </div>
             <div className="credit-card-contactless" aria-hidden>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c2-2.5 5.5-2.5 7.5 0" /><path d="M7 11.5c3.5-4 9.5-4 13 0" /><path d="M9.5 6.5c5.5-6 14.5-6 20 0" /></svg>
             </div>
             <div className="credit-card-number" style={headerStyle}>
               {`4000 ${student.nfcId.padStart(12, '0').match(/.{1,4}/g)?.join(' ')}`}
             </div>
             <div className="credit-card-valid-thru" style={headerStyle}>
               <span className="valid-thru-label">VALID<br/>THRU</span>
               <span className="valid-thru-date">06/27</span>
             </div>
           </>
        )}

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

        <div className="print-id-left flex items-center" style={{ marginLeft: '0.1in', gap: useQr ? '0.1in' : '0.12in' }}>

          {useQr ? (

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

                <span style={{...nameStyle, fontSize: '20pt', fontWeight: 800 }}>{studentInitials}</span>

              )}

            </div>

          )}

          

          <div className="print-id-text">

            <div className="print-id-name" style={nameStyle}>{fullName}</div>

            {displayNickname ? (

              <div className="print-id-nickname" style={metaStyle}>{displayNickname}</div>

            ) : null}

            <div className="print-id-class" style={classStyle}>Class: {className}</div>

          </div>

        </div>



        {(customEmojiUrl || themeEmoji) && (

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

      

      {!useQr ? (

        <div className="print-id-barcode-container" style={{ background: '#ffffff', color: '#000000', borderTop: `1px solid #e5e7eb` }}>

          <PrintIdCardScanCode value={student.nfcId} placement="footer" />

        </div>

      ) : null}

    </div>

  );

}


