'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-amber-400">
      {children}
    </kbd>
  );
}

export function ClassroomLiveCheatsheetTrigger({
  visible,
  onShow,
}: {
  visible: boolean;
  onShow: () => void;
}) {
  return (
    <motion.button
      type="button"
      layoutId={visible ? undefined : 'classroom-live-cheatsheet-pill'}
      transition={spring}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold tracking-normal',
        visible
          ? 'bg-indigo-500 text-white ring-2 ring-white/80'
          : 'border border-white/20 bg-white/10 text-white hover:bg-white/20',
      )}
      aria-label={visible ? 'Cheatsheet showing' : 'Cheatsheet'}
      aria-pressed={visible}
      title={visible ? 'Cheat sheet is open by the teacher desk' : 'Show the keyboard cheat sheet'}
      onClick={onShow}
    >
      <Lightbulb className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {visible ? 'Cheatsheet ✓' : 'Cheatsheet'}
    </motion.button>
  );
}

export function ClassroomLiveCheatsheetDesk({
  open,
  tapPoints = 5,
  instantTap = true,
  onHide,
}: {
  open: boolean;
  tapPoints?: number;
  instantTap?: boolean;
  onHide: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          key="classroom-live-cheatsheet-desk"
          layoutId="classroom-live-cheatsheet-pill"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={spring}
          className="pointer-events-auto relative z-20 w-[min(18.5rem,calc(100vw-8rem))] rounded-2xl border border-slate-700 bg-slate-900/95 p-4 text-slate-100 shadow-2xl backdrop-blur"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <Lightbulb className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Shortcuts
            </p>
            <button
              type="button"
              className="inline-flex h-6 items-center gap-1 rounded-lg px-1.5 text-[10px] font-semibold tracking-normal text-slate-400 hover:text-white"
              onClick={onHide}
            >
              Hide
              <X className="h-3 w-3" aria-hidden />
            </button>
          </div>
          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.05 } },
            }}
            className="space-y-2 text-[11px] font-medium leading-snug tracking-normal text-slate-100"
          >
            <motion.li variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: spring } }}>
              <span className="font-semibold text-slate-200">Points:</span> Click desk → <Kbd>{`+${tapPoints}`}</Kbd>
              {instantTap ? (
                <>
                  {' · '}
                  Right-click menu
                </>
              ) : (
                <> → menu</>
              )}
              {' · '}
              <Kbd>R</Kbd> random
            </motion.li>
            <motion.li variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: spring } }}>
              <span className="font-semibold text-slate-200">Notes:</span> Hold <Kbd>P</Kbd> · <Kbd>C</Kbd> · <Kbd>W</Kbd> ·{' '}
              <Kbd>I</Kbd> · <Kbd>H</Kbd> + click desk
            </motion.li>
            <motion.li variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: spring } }}>
              <span className="font-semibold text-slate-200">Hall:</span> <Kbd>Alt</Kbd>+click bathroom · 🟢 here · 🟠 late · 🔴
              not in
            </motion.li>
          </motion.ul>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
