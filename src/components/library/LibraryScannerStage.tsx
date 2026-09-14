'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LibraryScannerVisualStatus = 'idle' | 'scanning' | 'success';

const spring = { type: 'spring' as const, stiffness: 380, damping: 28 };

export function LibraryScannerStage({
  status,
  children,
  className,
}: {
  status: LibraryScannerVisualStatus;
  children: React.ReactNode;
  className?: string;
}) {
  const isSuccess = status === 'success';

  return (
    <div
      className={cn(
        'scanner-frame relative flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-border/80 bg-muted/10 p-8 sm:p-12 text-center',
        isSuccess && 'scanner-success',
        className,
      )}
    >
      <div className="scanner-beam" aria-hidden="true" />

      <div className="relative z-[1] grid size-16 place-items-center rounded-full border border-border/60 bg-background shadow-inner">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.span
              key="ok"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={spring}
              className="grid place-items-center"
            >
              <Check className="size-7 text-primary" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={spring}
              className="relative h-5 w-8 rounded-sm border-2 border-foreground/20"
            >
              <span className="absolute left-1 right-1 top-1 h-0.5 bg-primary/40" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-[1] space-y-1">
        <h4 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          {isSuccess ? 'Scan accepted' : 'Ready to scan'}
        </h4>
        <p className="text-xs text-muted-foreground">
          {isSuccess
            ? 'Clearing the field for the next item'
            : 'Position barcode in front of camera or scanner'}
        </p>
      </div>

      <div className="relative z-[1] w-full max-w-xl">{children}</div>

      <div className="relative z-[1] flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
        <span>
          {isSuccess ? 'Accepted' : status === 'scanning' ? 'Scanning' : 'Waiting for input'}
        </span>
        {isSuccess ? (
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
        ) : (
          <span className="flex items-center gap-0.5" aria-hidden="true">
            <span className="animate-bounce">·</span>
            <span className="animate-bounce [animation-delay:0.2s]">·</span>
            <span className="animate-bounce [animation-delay:0.4s]">·</span>
          </span>
        )}
      </div>
    </div>
  );
}
