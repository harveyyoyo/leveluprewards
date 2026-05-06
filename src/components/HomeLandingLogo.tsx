'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { LevelUpLogo } from '@/components/LevelUpLogo';
import {
  getHomeLogoMode,
  subscribeHomeLogoMode,
  type HomeLogoMode,
} from '@/lib/homeLogoMode';
import { getLevelUpLogoHref } from '@/lib/app-branding';

export function HomeLandingLogo() {
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
        className="flex min-h-[280px] w-full flex-col items-center justify-center"
        aria-busy="true"
        aria-label="Loading logo"
      >
        <Loader2 className="h-8 w-8 animate-spin text-slate-400/80" />
      </div>
    );
  }

  if (mode === 'static') {
    return (
      <Link href={getLevelUpLogoHref()} aria-label="LevelUp EDU — school sign-in" className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-2xl">
        <Logo className="h-48 w-48 sm:h-64 sm:w-64" />
      </Link>
    );
  }

  return (
    <Link href={getLevelUpLogoHref()} aria-label="LevelUp EDU — school sign-in" className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-2xl">
      <LevelUpLogo />
    </Link>
  );
}
