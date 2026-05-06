'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LevelUpLogoDrift } from '@/components/LevelUpLogoDrift';
import { getLevelUpLogoHref } from '@/lib/app-branding';

export function LevelUpKioskLogo({ className }: { className?: string }) {
  return (
    <Link
      href={getLevelUpLogoHref()}
      className={cn(
        'kiosk-brand-drift relative flex flex-col items-center justify-center p-1 text-inherit no-underline outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl',
        className,
      )}
      aria-label="LevelUp EDU — school sign-in"
    >
      <LevelUpLogoDrift className="gap-4 sm:gap-5" />
    </Link>
  );
}
