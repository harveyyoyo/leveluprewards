
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, Ticket } from 'lucide-react';
import type { SoundEffect } from '@/hooks/useArcadeSound';
import { LEVELUP_BRAND_PRIMARY_HEX } from '@/lib/app-branding';

export interface WelcomeOverlayTheme {
  primary: string;
  text: string;
  background: string;
  accent?: string;
  cardBackground?: string;
  /** Full CSS background when set (matches student kiosk page). */
  backgroundStyle?: string | null;
  primaryForeground: string;
  emoji?: string;
  fontFamily?: string;
}

interface WelcomeOverlayProps {
  studentName: string;
  points: number;
  photoUrl?: string;
  /** How long the overlay stays visible before auto-closing. */
  visibleDurationMs?: number;
  theme?: WelcomeOverlayTheme;
  onClose: () => void;
  playSound?: (name: SoundEffect) => void;
}

const DEFAULT_VISIBLE_MS = 2000;
const POINT_COUNT_MS = 1000;

const AnimatedPoints = React.memo(function AnimatedPoints({
  targetPoints,
  textColor,
}: {
  targetPoints: number;
  textColor: string;
}) {
  const [displayedPoints, setDisplayedPoints] = useState(0);

  useEffect(() => {
    setDisplayedPoints(0);
    if (targetPoints === 0) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / POINT_COUNT_MS);
      const eased = 1 - (1 - t) ** 3;
      setDisplayedPoints(Math.round(eased * targetPoints));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetPoints]);


  return (
    <span className="text-5xl font-black tabular-nums drop-shadow-sm" style={{ color: textColor }}>
      {displayedPoints.toLocaleString()}
    </span>
  );
});

export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({
  studentName,
  points,
  photoUrl,
  visibleDurationMs = DEFAULT_VISIBLE_MS,
  theme,
  onClose,
  playSound,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const targetPoints = Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0;

  // Parent often passes an inline `onClose`; including it in deps re-runs this effect
  // on every parent render and spams the redeem chime while Firestore/state updates stream in.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const playSoundRef = useRef(playSound);
  playSoundRef.current = playSound;

  useEffect(() => {
    if (playSoundRef.current) playSoundRef.current('redeem');

    const ms = Number.isFinite(visibleDurationMs) && visibleDurationMs > 0 ? visibleDurationMs : DEFAULT_VISIBLE_MS;
    const timer = setTimeout(() => {
      setIsVisible(false);
      onCloseRef.current();
    }, ms);
    return () => clearTimeout(timer);
  }, [visibleDurationMs]);


  const primaryColor = theme?.primary || 'hsl(var(--primary))';
  const accentColor = theme?.accent || primaryColor;
  const themeBg = theme?.background ?? '#f8fafc';
  const textColor = theme?.text ?? 'var(--foreground)';
  const cardBg = theme?.cardBackground ?? 'rgba(255,255,255,0.85)';
  const primaryFg = theme?.primaryForeground ?? '#ffffff';

  const panelBackground = useMemo(() => {
    if (theme?.backgroundStyle) return theme.backgroundStyle;
    if (theme) {
      const pri = theme.primary || LEVELUP_BRAND_PRIMARY_HEX;
      const acc = theme.accent || pri;
      return `radial-gradient(circle at top left, ${pri}33 0, transparent 46%), radial-gradient(circle at bottom right, ${acc}33 0, ${themeBg} 58%)`;
    }
    return `radial-gradient(circle at top left, hsl(var(--primary) / 0.18) 0, transparent 46%), radial-gradient(circle at bottom right, hsl(var(--accent) / 0.16) 0, hsl(var(--card)) 58%)`;
  }, [theme, themeBg]);

  const panelChromeStyle = useMemo(
    () =>
      ({
        background: panelBackground,
      }) as React.CSSProperties,
    [panelBackground],
  );

  /** color-mix works with hex or `hsl(var(--primary))`-style values (no bogus `${primary}40` suffix). */
  const panelFrameStyle = useMemo(
    () =>
      ({
        boxShadow: `0 25px 50px -14px rgba(15, 23, 42, 0.2), 0 0 0 1px color-mix(in srgb, ${primaryColor} 36%, transparent)`,
        fontFamily: theme?.fontFamily,
      }) as React.CSSProperties,
    [primaryColor, theme?.fontFamily],
  );

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto p-3 sm:p-5">
      <div className="absolute inset-0 z-0 bg-transparent" aria-hidden />

      <div
        style={panelFrameStyle}
        className="relative z-10 flex w-full max-w-md shrink-0 flex-col overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] max-h-[min(82svh,42rem)]"
      >
        <div style={panelChromeStyle} className="absolute inset-0 rounded-[inherit]" />

        <div
          style={{ color: textColor }}
          className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-y-auto text-center px-5 py-6 sm:p-8"
        >
          <div className="relative mb-6">
            <div
              className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 shadow-xl"
              style={{
                borderColor: primaryColor,
                backgroundColor: cardBg,
                color: textColor,
              }}
            >
              {photoUrl ? (
                <img src={photoUrl} alt={studentName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl font-bold" style={{ color: primaryColor }}>
                  {studentName.charAt(0)}
                </span>
              )}
            </div>
            <div
              className="absolute -inset-2 rounded-full border-2 border-dashed opacity-45"
              style={{ borderColor: primaryColor }}
            />
            <div
              className="absolute -bottom-2 -right-2 rounded-full p-2 shadow-lg"
              style={{ backgroundColor: primaryColor, color: primaryFg }}
            >
              <Trophy size={20} />
            </div>
          </div>

          <h1 className="mb-2 text-4xl font-black tracking-tight md:text-5xl" style={{ color: textColor }}>
            WELCOME BACK!
          </h1>

          <div className="mb-6 flex items-center gap-2 text-2xl font-bold md:text-3xl" style={{ color: primaryColor }}>
            {studentName}{' '}
            {theme?.emoji &&
              (theme.emoji.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={theme.emoji} alt="" className="inline h-9 w-9 object-contain md:h-10 md:w-10" />
              ) : (
                <span>{theme.emoji}</span>
              ))}
          </div>

          <div
            className="w-full rounded-3xl border p-6 shadow-lg backdrop-blur-sm"
            style={{
              backgroundColor: cardBg,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: `color-mix(in srgb, ${primaryColor} 40%, transparent)`,
              boxShadow: `0 12px 40px -12px color-mix(in srgb, ${primaryColor} 20%, transparent)`,
            }}
          >
            <p className="mb-1 text-sm font-bold uppercase tracking-widest opacity-75">Your Balance</p>
            <div className="flex items-center justify-center gap-2">
              <Ticket className="h-8 w-8 shrink-0" style={{ color: primaryColor }} aria-hidden />
              <AnimatedPoints targetPoints={targetPoints} textColor={textColor} />
              <span className="text-xl font-bold opacity-70">PTS</span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsVisible(false);
              onCloseRef.current();
            }}
            type="button"
            className="mt-8 rounded-full px-8 py-3 font-black uppercase tracking-widest shadow-lg hover:opacity-95"
            style={{ backgroundColor: primaryColor, color: primaryFg }}
          >
            Let's Go!
          </button>
        </div>
      </div>
    </div>
  );
};
