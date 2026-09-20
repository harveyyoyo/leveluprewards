'use client';

import { useEffect, useState } from 'react';
import { CircleHelp, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type RaffleAnimationNoticeProps = {
  className?: string;
  /** Tiny ? that opens help only when the teacher needs it (Live raffle drawer). */
  variant?: 'banner' | 'helpButton';
};

function AnimationHelpBody({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="space-y-2 text-xs leading-relaxed">
      <p>
        If the jackpot reels or spinning wheel jump straight to a winner with no spin, your computer may have
        system animations turned off. The raffle still picks a fair winner — you just will not see the animation.
      </p>
      {reducedMotion ? (
        <p className="font-semibold">Animations are off on this computer right now.</p>
      ) : null}
      <div>
        <p className="font-semibold">On Windows 11</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li>Open <strong>Settings</strong> (Windows key, then type &quot;Settings&quot;).</li>
          <li>Go to <strong>Accessibility</strong> → <strong>Visual effects</strong>.</li>
          <li>Turn on <strong>Animation effects</strong>.</li>
          <li>Refresh this page and try the draw again.</li>
        </ol>
      </div>
      <div>
        <p className="font-semibold">On Windows 10</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li>Open <strong>Settings</strong> → <strong>Ease of Access</strong> → <strong>Display</strong>.</li>
          <li>Turn on <strong>Show animations in Windows</strong>.</li>
          <li>Refresh this page and try the draw again.</li>
        </ol>
      </div>
    </div>
  );
}

/**
 * Troubleshooting tip when raffle spin/reel animations are skipped because the OS
 * reports prefers-reduced-motion (common when Windows system animations are off).
 */
export function RaffleAnimationNotice({ className, variant = 'banner' }: RaffleAnimationNoticeProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  if (variant === 'helpButton') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white hover:bg-white/25',
              className,
            )}
            aria-label="Animation help"
            title="Wheel or reels look frozen?"
          >
            <CircleHelp className="h-4 w-4" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-4">
          <p className="mb-2 text-sm font-black">Wheel or reels look frozen?</p>
          <AnimationHelpBody reducedMotion={reducedMotion} />
        </PopoverContent>
      </Popover>
    );
  }

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
      <AlertDescription>
        <AnimationHelpBody reducedMotion={reducedMotion} />
      </AlertDescription>
    </Alert>
  );
}
