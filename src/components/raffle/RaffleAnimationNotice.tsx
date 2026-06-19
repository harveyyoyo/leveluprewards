'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type RaffleAnimationNoticeProps = {
  className?: string;
};

/**
 * Troubleshooting tip when raffle spin/reel animations are skipped because the OS
 * reports prefers-reduced-motion (common when Windows system animations are off).
 */
export function RaffleAnimationNotice({ className }: RaffleAnimationNoticeProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  return (
    <Alert
      className={cn(
        'border-sky-200/80 bg-sky-50/90 text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-100',
        className,
      )}
    >
      <Info className="h-4 w-4" aria-hidden />
      <AlertTitle className="text-sm">
        {reducedMotion ? 'Animations are off on this computer' : 'Wheel or reels look frozen?'}
      </AlertTitle>
      <AlertDescription className="space-y-2 text-xs leading-relaxed">
        <p>
          If the jackpot reels or spinning wheel jump straight to a winner with no spin, your computer may have
          system animations turned off. The raffle still picks a fair winner — you just will not see the animation.
        </p>
        <div>
          <p className="font-semibold text-foreground">On Windows 11</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>Open <strong>Settings</strong> (Windows key, then type &quot;Settings&quot;).</li>
            <li>Go to <strong>Accessibility</strong> → <strong>Visual effects</strong>.</li>
            <li>Turn on <strong>Animation effects</strong>.</li>
            <li>Refresh this page and try the draw again.</li>
          </ol>
        </div>
        <div>
          <p className="font-semibold text-foreground">On Windows 10</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>Open <strong>Settings</strong> → <strong>Ease of Access</strong> → <strong>Display</strong>.</li>
            <li>Turn on <strong>Show animations in Windows</strong>.</li>
            <li>Refresh this page and try the draw again.</li>
          </ol>
        </div>
      </AlertDescription>
    </Alert>
  );
}
