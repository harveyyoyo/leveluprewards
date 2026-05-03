'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { LevelUpLogoDrift } from '@/components/LevelUpLogoDrift';

/**
 * Student kiosk / scanner branding: always show the animated drift mark so it is visible even when a
 * global app logo is configured (Firestore `appLogoUrl`). Optional small badge uses that image underneath.
 */
export function LevelUpKioskLogo({ className, src }: { className?: string; src?: string }) {
  const { settings } = useSettings();
  const trimmed = (src ?? '').trim();

  return (
    <div
      className={cn(
        'kiosk-brand-drift relative flex flex-col items-center justify-center gap-2 p-1',
        className,
      )}
    >
      <LevelUpLogoDrift className="gap-6 sm:gap-8" />
      {trimmed ? (
        <div
          className={cn(
            'relative z-10 mx-auto mt-1 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden sm:h-11 sm:w-11',
            'rounded-xl border border-border/60 bg-background/80 shadow-sm',
            settings.logoDropShadow === 'sm' && 'drop-shadow-sm',
            settings.logoDropShadow === 'md' && 'drop-shadow-md',
            settings.logoDropShadow === 'lg' && 'drop-shadow-xl',
            settings.logoDropShadow === 'none' && 'drop-shadow-none',
          )}
        >
          <Image
            src={trimmed}
            alt=""
            width={44}
            height={44}
            className={cn(
              'max-h-full max-w-full object-contain p-1',
              settings.logoDisplayMode === 'cover' && 'object-cover',
              settings.logoBorderRadius === 'sm' && 'rounded-sm',
              settings.logoBorderRadius === 'md' && 'rounded-md',
              settings.logoBorderRadius === 'lg' && 'rounded-lg',
              settings.logoBorderRadius === 'full' && 'rounded-full',
              settings.logoBorderRadius === 'none' && 'rounded-none',
            )}
            priority
          />
        </div>
      ) : null}
    </div>
  );
}
