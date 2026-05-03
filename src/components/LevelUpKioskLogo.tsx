'use client';

import { cn } from '@/lib/utils';
import { LevelUpLogoDrift } from '@/components/LevelUpLogoDrift';

export function LevelUpKioskLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'kiosk-brand-drift relative flex flex-col items-center justify-center p-1',
        className,
      )}
    >
      <LevelUpLogoDrift className="gap-4 sm:gap-5" />
    </div>
  );
}
