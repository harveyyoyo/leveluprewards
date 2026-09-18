'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Footprints } from 'lucide-react';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export function ClassroomDeskPassOutBadge({
  visible,
  compact = false,
  overLimit = false,
  passLabel,
}: {
  visible: boolean;
  compact?: boolean;
  overLimit?: boolean;
  passLabel?: string | null;
}) {
  const title = overLimit
    ? 'Over pass time — mark returned from the hall list'
    : passLabel
      ? `Out on a ${passLabel} pass`
      : 'Out of the room on a hall pass';

  return (
    <AnimatePresence>
      {visible ? (
        <motion.span
          key="classroom-desk-pass-out"
          initial={{ opacity: 0, y: -8, scale: 0.86 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.86 }}
          transition={spring}
          className={cn(
            'pointer-events-none absolute left-1 top-1 z-[13] inline-flex max-w-[calc(100%-2.5rem)] items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold leading-none text-slate-950 shadow-sm',
            compact && 'text-[10px]',
          )}
          title={title}
        >
          <Footprints className="h-3 w-3 shrink-0" aria-hidden />
          {compact ? <span className="sr-only">Pass Out</span> : <span>Pass Out</span>}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
