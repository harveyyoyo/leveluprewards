'use client';

import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const PEEK_PX = 18;

function PanelChrome({
  label,
  onDismiss,
}: {
  label: string;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-border/30 pb-1.5">
      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        {label}
      </span>
      <button
        type="button"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background/80 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        onClick={onDismiss}
        aria-label={`Hide ${label}`}
        title={`Hide ${label} (hover edge to show again)`}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

function PeekAffordance({ position, label }: { position: 'top' | 'right'; label: string }) {
  const isTop = position === 'top';
  return (
    <div
      className={cn(
        'pointer-events-none absolute flex items-center justify-center bg-gradient-to-b from-transparent to-muted/40',
        isTop
          ? 'inset-x-0 bottom-0 h-3.5'
          : 'inset-y-0 right-0 w-3.5 bg-gradient-to-l from-muted/50 to-transparent',
      )}
      aria-hidden
    >
      <span
        className={cn(
          'flex items-center gap-0.5 rounded-full border border-border/50 bg-card/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm backdrop-blur-sm',
          isTop ? 'flex-row' : 'flex-col [writing-mode:vertical-rl] rotate-180',
        )}
      >
        {isTop ? <ChevronDown className="h-2.5 w-2.5 shrink-0" /> : <ChevronLeft className="h-2.5 w-2.5 shrink-0" />}
        <span className={isTop ? '' : 'tracking-widest'}>{label}</span>
      </span>
    </div>
  );
}

export function ClassroomMonitorHoverPanel({
  position,
  peekLabel,
  children,
  className,
  contentClassName,
}: {
  position: 'top' | 'right';
  peekLabel: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const reducedMotion = useReducedMotion();
  const expanded = !dismissed || hovering;
  const isTop = position === 'top';

  const handleDismiss = () => {
    setDismissed(true);
    setHovering(false);
  };

  const spring = reducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 34 };

  if (isTop) {
    return (
      <div
        className={cn('relative shrink-0', className)}
        onMouseEnter={() => dismissed && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {dismissed && !hovering ? <div className="h-[18px] shrink-0" aria-hidden /> : null}
        <motion.div
          className={cn(
            'border-b border-border/40 bg-muted/15',
            dismissed ? 'absolute inset-x-0 top-0 z-30 shadow-md' : 'relative',
            dismissed && hovering && 'shadow-lg',
          )}
          initial={false}
          animate={{
            y: expanded ? 0 : `calc(-100% + ${PEEK_PX}px)`,
          }}
          transition={spring}
        >
          <div className={cn('px-3 py-2', contentClassName)}>
            <PanelChrome label={peekLabel} onDismiss={handleDismiss} />
            {children}
          </div>
          {dismissed && !hovering ? <PeekAffordance position="top" label={peekLabel} /> : null}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative self-stretch',
        expanded ? 'w-44 shrink-0 lg:w-52' : 'w-[18px] shrink-0',
        className,
      )}
      onMouseEnter={() => dismissed && setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <motion.aside
        className={cn(
          'absolute right-0 top-0 bottom-0 z-30 flex w-44 min-h-0 flex-col border-l border-border/50 bg-muted/10 pl-3 pr-2 lg:w-52',
          dismissed && hovering && 'shadow-lg',
        )}
        initial={false}
        animate={{
          x: expanded ? 0 : `calc(100% - ${PEEK_PX}px)`,
        }}
        transition={spring}
      >
        <div className={cn('flex min-h-0 flex-1 flex-col', contentClassName)}>
          <PanelChrome label={peekLabel} onDismiss={handleDismiss} />
          {children}
        </div>
        {dismissed && !hovering ? <PeekAffordance position="right" label={peekLabel} /> : null}
      </motion.aside>
    </div>
  );
}
