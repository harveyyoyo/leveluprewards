'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { LevelUpLogo } from '@/components/LevelUpLogo';
import {
  getHomeLogoMode,
  subscribeHomeLogoMode,
  type HomeLogoMode,
} from '@/lib/homeLogoMode';

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
    return <Logo className="h-48 w-48 sm:h-64 sm:w-64" />;
  }

  return <LevelUpLogo />;
}
