'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatedLogoSplashLanding } from '@/components/marketing/archived/AnimatedLogoSplashLanding';
import { ShowcaseLanding } from '@/components/marketing/ShowcaseLanding';

const DEFAULT_SPLASH_MS = 2200;
const SPLASH_SESSION_KEY = 'levelup:showcaseSplashSeen';
const EXIT_MS = 700;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function readSessionSeen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(SPLASH_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSessionSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
  } catch {
    // ignore
  }
}

export function ShowcaseLandingWithSplash({ splashMs = DEFAULT_SPLASH_MS }: { splashMs?: number }) {
  const shouldSkipSplash = useMemo(() => prefersReducedMotion() || readSessionSeen(), []);
  const [showSplash, setShowSplash] = useState(!shouldSkipSplash);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (shouldSkipSplash) return;
    let exitTimer: number | undefined;
    const holdTimer = window.setTimeout(() => {
      writeSessionSeen();
      setExiting(true);
      exitTimer = window.setTimeout(() => setShowSplash(false), EXIT_MS);
    }, Math.max(0, splashMs));
    return () => {
      window.clearTimeout(holdTimer);
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
    };
  }, [shouldSkipSplash, splashMs]);

  return (
    <div className="relative min-h-screen bg-[#f4f0e8]">
      <ShowcaseLanding />
      {showSplash ? (
        <div
          className={[
            'fixed inset-0 z-[60] bg-slate-950 transition-opacity ease-out motion-reduce:transition-none',
            exiting ? 'pointer-events-none opacity-0' : 'opacity-100',
          ].join(' ')}
          style={{ transitionDuration: `${EXIT_MS}ms` }}
          aria-hidden={exiting}
        >
          <AnimatedLogoSplashLanding />
        </div>
      ) : null}
    </div>
  );
}
