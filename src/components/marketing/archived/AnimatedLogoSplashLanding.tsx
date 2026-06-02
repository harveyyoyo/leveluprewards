'use client';

import { HomeLandingLogo } from '@/components/logos/HomeLandingLogo';

/** Brief intro: animated logo on dark canvas (matches logo glow). */
export function AnimatedLogoSplashLanding() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6">
      <HomeLandingLogo linkToLogin={false} />
    </div>
  );
}
