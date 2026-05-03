'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { LevelUpLogoDrift } from '@/components/LevelUpLogoDrift';

export function LevelUpKioskLogo({ className, src }: { className?: string; src?: string }) {
  const { settings } = useSettings();
  const trimmed = (src ?? '').trim();

  if (!trimmed) {
    return (
      <div className={cn('relative flex items-center justify-center p-1', className)}>
        <LevelUpLogoDrift />
      </div>
    );
  }

  return (
    <div className={cn('relative flex items-center justify-center p-1', className)}>
      <div
        className={cn(
          'relative z-10 animate-blur-in',
          settings.logoDropShadow === 'sm' && 'drop-shadow-sm',
          settings.logoDropShadow === 'md' && 'drop-shadow-md',
          settings.logoDropShadow === 'lg' && 'drop-shadow-xl',
          settings.logoDropShadow === 'none' && 'drop-shadow-none',
        )}
      >
        <Image
          src={trimmed}
          alt="App logo"
          width={160}
          height={160}
          className={cn(
            'object-contain overflow-hidden',
            settings.logoDisplayMode === 'cover' && 'object-cover',
            settings.logoBorderRadius === 'sm' && 'rounded-sm',
            settings.logoBorderRadius === 'md' && 'rounded-md',
            settings.logoBorderRadius === 'lg' && 'rounded-2xl',
            settings.logoBorderRadius === 'full' && 'rounded-full',
            settings.logoBorderRadius === 'none' && 'rounded-none',
          )}
          priority
        />
      </div>
    </div>
  );
}
