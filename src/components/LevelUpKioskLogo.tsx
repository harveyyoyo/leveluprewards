'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';

export function LevelUpKioskLogo({ className, src }: { className?: string; src?: string }) {
  const { settings } = useSettings();

  return (
    <div className={cn("relative flex items-center justify-center p-1", className)}>
      {/* Logo Container */}
      <div className={cn(
        "relative z-10 animate-blur-in",
        settings.logoDropShadow === 'sm' && 'drop-shadow-sm',
        settings.logoDropShadow === 'md' && 'drop-shadow-md',
        settings.logoDropShadow === 'lg' && 'drop-shadow-xl',
        settings.logoDropShadow === 'none' && 'drop-shadow-none',
      )}>
        <Image
          src={src || "/logo.png"}
          alt="LevelUp Logo"
          width={160}
          height={160}
          className={cn(
            "object-contain overflow-hidden",
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
