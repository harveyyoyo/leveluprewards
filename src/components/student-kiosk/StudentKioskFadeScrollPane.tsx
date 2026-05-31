'use client';

import type { ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Match kiosk theme background for the bottom fade. */
  themed?: boolean;
  contentRef?: Ref<HTMLDivElement>;
};

/** Scrollable kiosk column: no visible scrollbar, soft fade above pinned footer actions. */
export function StudentKioskFadeScrollPane({ children, className, themed, contentRef }: Props) {
  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <div
        ref={contentRef}
        className={cn(
          'min-h-0 flex-1 overflow-x-hidden overflow-y-auto',
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        <div className="flex flex-col gap-3 pb-1">{children}</div>
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10',
          !themed && 'bg-gradient-to-t from-background via-background/80 to-transparent',
        )}
        style={
          themed
            ? {
                background:
                  'linear-gradient(to top, var(--theme-bg) 0%, color-mix(in srgb, var(--theme-bg) 72%, transparent) 55%, transparent 100%)',
              }
            : undefined
        }
        aria-hidden
      />
    </div>
  );
}
