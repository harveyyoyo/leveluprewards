'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import {
  ClassroomSeatingShortcutsHint,
  type ClassroomSeatingShortcutsHintState,
} from '@/components/points/classroomSeatingShortcutsHint';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export function ClassroomKeyboardTipsDock({
  open,
  onOpenChange,
  hint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hint: ClassroomSeatingShortcutsHintState;
}) {
  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 items-stretch justify-end">
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.aside
            key="classroom-keyboard-tips-open"
            layoutId="classroom-keyboard-tips"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
            className="pointer-events-auto flex h-full min-h-0 w-full max-w-xs flex-col overflow-hidden rounded-2xl border-2 border-[#102033] bg-[#102033] shadow-md"
            aria-label="Keyboard tips"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/15 px-2.5 py-1">
              <p className="classroom-on-dark text-[10px] font-black uppercase tracking-wide" style={{ color: '#fff' }}>
                Tips
              </p>
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/25 bg-white/10 text-white hover:bg-white/20"
                aria-label="Hide keyboard tips"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.05 } },
              }}
              className="min-h-0 flex-1 overflow-y-auto bg-card px-2.5 py-1.5 !text-foreground"
            >
              <ClassroomSeatingShortcutsHint {...hint} monitorDisplay />
            </motion.div>
          </motion.aside>
        ) : (
          <motion.button
            key="classroom-keyboard-tips-tab"
            type="button"
            layoutId="classroom-keyboard-tips"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={spring}
            className={cn(
              'pointer-events-auto my-auto inline-flex h-9 items-center gap-1.5 rounded-xl border-2 border-[#102033] bg-[#102033] px-3 text-xs font-black uppercase tracking-wide text-white shadow-md',
              'hover:bg-[#1a3348]',
            )}
            aria-label="Show keyboard tips"
            title="Shortcut tips"
            onClick={() => onOpenChange(true)}
          >
            <Keyboard className="h-4 w-4 shrink-0" aria-hidden />
            <span className="classroom-on-dark" style={{ color: '#fff' }}>
              Tips
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
