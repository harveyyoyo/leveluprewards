'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/logos/Logo';
import { LevelUpLogo } from '@/components/logos/LevelUpLogo';
import {
  getHomeLogoMode,
  subscribeHomeLogoMode,
  type HomeLogoMode,
} from '@/lib/homeLogoMode';
import { getLevelUpLogoHref } from '@/lib/appBranding';
import { cn } from '@/lib/utils';

type HomeLandingLogoProps = {
  /** When false, logo is display-only (splash intro). Default true. */
  linkToLogin?: boolean;
  /** Larger cinematic logo for homepage intro. */
  size?: 'default' | 'intro';
  /** Color mode for animated logo. */
  tone?: 'dark' | 'light';
  /** Force animated cinematic logo regardless of saved mode. */
  forceAnimated?: boolean;
  className?: string;
};

export function HomeLandingLogo({
  linkToLogin = true,
  size = 'default',
  tone = 'dark',
  forceAnimated = false,
  className,
}: HomeLandingLogoProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<HomeLogoMode>('animated');

  useEffect(() => {
    setMounted(true);
    setMode(getHomeLogoMode());
    return subscribeHomeLogoMode(() => setMode(getHomeLogoMode()));
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'flex min-h-[280px] w-full flex-col items-center justify-center',
          className,
        )}
        aria-busy="true"
        aria-label="Loading logo"
      >
        <Loader2 className="h-8 w-8 animate-spin text-slate-400/80" />
      </div>
    );
  }

    const staticLogoClass =
    size === 'intro' ? 'h-52 w-52 sm:h-72 sm:w-72' : 'h-48 w-48 sm:h-64 sm:w-64';

  const useStaticLogo = !forceAnimated && mode === 'static';
  const logo =
    useStaticLogo ? (
      <Logo className={staticLogoClass} />
    ) : (
      <LevelUpLogo size={size} tone={tone} />
    );

  if (!linkToLogin) {
    return (
      <div className={cn('inline-flex', className)} aria-label="LevelUp EDU">
        {logo}
      </div>
    );
  }

  return (
    <Link
      href={getLevelUpLogoHref()}
      aria-label="LevelUp EDU — school sign-in"
      className={cn(
        'inline-flex outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-2xl',
        className,
      )}
    >
      {logo}
    </Link>
  );
}
