
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  /** How long the overlay stays visible before auto-closing (default 3s, plus exit animation). */
  visibleDurationMs?: number;
  theme?: WelcomeOverlayTheme;
  onClose: () => void;
  playSound?: (name: SoundEffect) => void;
}

const DEFAULT_VISIBLE_MS = 3000;
const POINT_COUNT_MS = 1000;

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
  const [displayedPoints, setDisplayedPoints] = useState(0);

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
      setTimeout(() => onCloseRef.current(), 500); // Wait for exit animation
    }, ms);
    return () => clearTimeout(timer);
  }, [visibleDurationMs]);

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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto p-3 sm:p-5"
        >
          {/* Blocks taps to the kiosk without dimming the whole display */}
          <div className="absolute inset-0 z-0 bg-transparent" aria-hidden />

          {/* Floating panel — centered; theme matches student kiosk */}
          <motion.div
            initial={{ y: 22, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 340 }}
            style={panelFrameStyle}
            className="relative z-10 flex w-full max-w-md shrink-0 flex-col overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] max-h-[min(82svh,42rem)]"
          >
          {/* Panel surface */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={panelChromeStyle}
            className="absolute inset-0 rounded-[inherit]"
          />

          {/* Confetti-like particles (clipped to panel) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * 100 - 50 + '%', 
                  y: '110%',
                  rotate: 0,
                  opacity: 1
                }}
                animate={{ 
                  y: '-10%',
                  rotate: 360,
                  opacity: 0
                }}
                transition={{ 
                  duration: 2 + Math.random() * 2, 
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "easeOut"
                }}
                className="absolute w-4 h-4"
                style={{ 
                  backgroundColor: i % 3 === 0 ? primaryColor : i % 3 === 1 ? accentColor : theme ? themeBg : primaryColor,
                  borderRadius: i % 2 === 0 ? '50%' : '2px'
                }}
              />
            ))}
          </div>

          {/* Main Content */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.06, type: "spring", damping: 20, stiffness: 100 }}
            style={{ color: textColor }}
            className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-y-auto text-center px-5 py-6 sm:p-8"
          >
            {/* Profile Picture / Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="relative mb-6"
            >
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
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-2 rounded-full border-2 border-dashed opacity-55"
                style={{ borderColor: primaryColor }}
              />
              <div
                className="absolute -bottom-2 -right-2 rounded-full p-2 shadow-lg"
                style={{ backgroundColor: primaryColor, color: primaryFg }}
              >
                <Trophy size={20} />
              </div>
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-2 text-4xl font-black tracking-tight md:text-5xl"
              style={{ color: textColor }}
            >
              WELCOME BACK!
            </motion.h1>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-6 flex items-center gap-2 text-2xl font-bold md:text-3xl"
              style={{ color: primaryColor }}
            >
              {studentName}{' '}
              {theme?.emoji &&
                (theme.emoji.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={theme.emoji} alt="" className="inline h-9 w-9 object-contain md:h-10 md:w-10" />
                ) : (
                  <span>{theme.emoji}</span>
                ))}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
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
                <span className="text-5xl font-black tabular-nums drop-shadow-sm" style={{ color: textColor }}>
                  {displayedPoints.toLocaleString()}
                </span>
                <span className="text-xl font-bold opacity-70">PTS</span>
              </div>
            </motion.div>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onCloseRef.current(), 500);
              }}
              type="button"
              className="mt-8 rounded-full px-8 py-3 font-black uppercase tracking-widest shadow-lg transition-opacity hover:opacity-95"
              style={{ backgroundColor: primaryColor, color: primaryFg }}
            >
              Let's Go!
            </motion.button>
          </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
