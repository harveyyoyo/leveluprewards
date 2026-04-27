'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Student } from '@/lib/types';
import { cn, getStudentNickname } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { APP_NAME, APP_TAGLINE } from '@/lib/app-branding';
import { GoogleFontLoader } from '@/components/GoogleFontLoader';

function AutoFitLine({
  text,
  className,
  style,
  minScale = 0.72,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  minScale?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [scaleX, setScaleX] = useState(1);

  const measure = useMemo(() => {
    return () => {
      const wrap = wrapRef.current;
      const span = textRef.current;
      if (!wrap || !span) return;

      // Reset first to measure unscaled width.
      span.style.transform = 'none';

      const wrapW = wrap.clientWidth;
      const textW = span.scrollWidth;
      if (!wrapW || !textW) return;

      const next = Math.max(minScale, Math.min(1, wrapW / textW));
      setScaleX((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };
  }, [minScale]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure());
      ro.observe(wrap);
    }

    const t = window.setTimeout(() => measure(), 0);
    void (document as any).fonts?.ready?.then?.(() => measure());

    return () => {
      window.clearTimeout(t);
      if (ro) ro.disconnect();
    };
  }, [measure, text]);

  return (
    <div ref={wrapRef} className={cn('min-w-0', className)} style={style}>
      <span
        ref={textRef}
        style={{
          display: 'inline-block',
          transformOrigin: 'left center',
          transform: scaleX < 0.999 ? `scaleX(${scaleX})` : undefined,
          willChange: 'transform',
        }}
      >
        {text}
      </span>
    </div>
  );
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
  const themeTracking = typeof theme?.fontTracking === 'number' ? theme.fontTracking : undefined;
  const themeFontStyle = theme?.fontStyle;
  const themeFontWeight = typeof theme?.fontWeight === 'number' ? theme.fontWeight : undefined;

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
  const displayNickname = getStudentNickname(student);
  const fullName = `${displayFirst} ${displayLast}`.trim();

  return (
    <div className={cn("print-id-card", isColorEnabled && "is-colored")} style={cardStyle}>
      {themeFontFamily && <GoogleFontLoader fontFamily={themeFontFamily} />}
      <div className="print-id-header-container">
        <div className="print-id-app" style={headerStyle}>
          {appLogoUrl && (
            <div className="print-id-app-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={appLogoUrl} alt="" className={settings.logoDisplayMode === 'cover' ? 'object-cover' : 'object-contain'} />
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
              <img src={schoolLogoUrl} alt="" className={settings.logoDisplayMode === 'cover' ? 'object-cover' : 'object-contain'} />
            </div>
          )}
        </div>
      </div>
      
      <div className="print-id-main" style={mainStyle}>
        <div className="print-id-left flex items-center" style={{ marginLeft: '0.1in', gap: '0.12in' }}>
          <div className="print-id-avatar" style={avatarStyle}>
            {student.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.photoUrl} alt="" className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
            ) : (
              <span style={{...nameStyle, fontSize: '20pt', fontWeight: 800 }}>{(student.firstName[0] || '')}{(student.lastName[0] || '')}</span>
            )}
          </div>
          
          <div className="print-id-text">
            <AutoFitLine text={fullName} className="print-id-name" style={nameStyle} />
            {displayNickname ? (
              <AutoFitLine text={displayNickname} className="print-id-nickname" style={metaStyle} minScale={0.78} />
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
